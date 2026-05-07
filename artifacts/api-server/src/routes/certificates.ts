import { Router } from "express";
import { db } from "@workspace/db";
import { certificatesTable, enrollmentsTable, studentsTable, coursesTable, lessonCompletionsTable, lessonsTable, modulesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

async function getProgress(studentId: number, courseId: number): Promise<number> {
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonsTable)
    .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
    .where(eq(modulesTable.courseId, courseId));

  const [done] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lessonCompletionsTable)
    .innerJoin(lessonsTable, eq(lessonCompletionsTable.lessonId, lessonsTable.id))
    .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
    .where(and(eq(lessonCompletionsTable.studentId, studentId), eq(modulesTable.courseId, courseId)));

  const totalCount = total?.count ?? 0;
  const doneCount = done?.count ?? 0;
  if (totalCount === 0) return 0;
  return Math.round((doneCount / totalCount) * 100);
}

router.post("/issue", async (req, res) => {
  try {
    const { studentId, courseId, adminOverride } = req.body;
    if (!studentId || !courseId) return res.status(400).json({ error: "studentId and courseId required" });

    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.studentId, studentId), eq(enrollmentsTable.courseId, courseId)));

    if (!enrollment) return res.status(404).json({ error: "Student is not enrolled in this course" });

    if (!adminOverride) {
      const progress = await getProgress(studentId, courseId);
      if (progress < 100) return res.status(400).json({ error: `Progress is ${progress}% — must be 100% to issue certificate` });
    }

    const year = new Date().getFullYear();
    const rand = crypto.randomInt(100000, 999999);
    const certificateNumber = `CERT-${year}-${rand}`;

    const [cert] = await db
      .insert(certificatesTable)
      .values({ studentId, courseId, enrollmentId: enrollment.id, certificateNumber })
      .returning();

    res.status(201).json(cert);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Certificate already issued for this course" });
    req.log.error({ err }, "Error issuing certificate");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/student/:studentId", async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId!);
    const rows = await db
      .select({
        cert: certificatesTable,
        courseTitle: coursesTable.title,
        courseTitleAr: coursesTable.titleAr,
      })
      .from(certificatesTable)
      .innerJoin(coursesTable, eq(certificatesTable.courseId, coursesTable.id))
      .where(eq(certificatesTable.studentId, studentId));

    res.json(rows.map((r) => ({
      id: r.cert.id,
      certificateNumber: r.cert.certificateNumber,
      courseTitle: r.courseTitle,
      courseTitleAr: r.courseTitleAr ?? null,
      issuedAt: r.cert.issuedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching certificates");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/verify/:certificateNumber", async (req, res) => {
  try {
    const { certificateNumber } = req.params;
    const [row] = await db
      .select({
        cert: certificatesTable,
        studentName: studentsTable.name,
        courseTitle: coursesTable.title,
        courseTitleAr: coursesTable.titleAr,
      })
      .from(certificatesTable)
      .innerJoin(studentsTable, eq(certificatesTable.studentId, studentsTable.id))
      .innerJoin(coursesTable, eq(certificatesTable.courseId, coursesTable.id))
      .where(eq(certificatesTable.certificateNumber, certificateNumber!));

    if (!row) return res.json({ valid: false });

    res.json({
      valid: true,
      studentName: row.studentName,
      courseTitle: row.courseTitle,
      courseTitleAr: row.courseTitleAr ?? null,
      issuedAt: row.cert.issuedAt.toISOString(),
      certificateNumber: row.cert.certificateNumber,
    });
  } catch (err) {
    req.log.error({ err }, "Error verifying certificate");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
