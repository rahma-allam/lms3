import { Router } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, studentsTable, coursesTable, activityTable, lessonCompletionsTable, lessonsTable, modulesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

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

router.get("/", async (req, res) => {
  try {
    const { studentId, courseId } = req.query;

    if (studentId) {
      const rows = await db
        .select({
          enrollment: enrollmentsTable,
          courseTitle: coursesTable.title,
          courseTitleAr: coursesTable.titleAr,
          courseType: coursesTable.courseType,
          thumbnailUrl: coursesTable.thumbnailUrl,
        })
        .from(enrollmentsTable)
        .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
        .where(eq(enrollmentsTable.studentId, parseInt(studentId as string)));

      const enriched = await Promise.all(
        rows.map(async (r) => ({
          id: r.enrollment.id,
          studentId: r.enrollment.studentId,
          courseId: r.enrollment.courseId,
          courseTitle: r.courseTitle,
          courseTitleAr: r.courseTitleAr ?? null,
          courseType: r.courseType,
          thumbnailUrl: r.thumbnailUrl ?? null,
          status: r.enrollment.status,
          enrolledAt: r.enrollment.enrolledAt.toISOString(),
          progress: await getProgress(r.enrollment.studentId, r.enrollment.courseId),
        }))
      );
      return res.json(enriched);
    }

    if (courseId) {
      const rows = await db
        .select({
          enrollment: enrollmentsTable,
          studentName: studentsTable.name,
          studentEmail: studentsTable.email,
        })
        .from(enrollmentsTable)
        .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
        .where(eq(enrollmentsTable.courseId, parseInt(courseId as string)));

      const enriched = await Promise.all(
        rows.map(async (r) => ({
          id: r.enrollment.id,
          studentId: r.enrollment.studentId,
          studentName: r.studentName,
          studentEmail: r.studentEmail,
          status: r.enrollment.status,
          enrolledAt: r.enrollment.enrolledAt.toISOString(),
          progress: await getProgress(r.enrollment.studentId, r.enrollment.courseId),
        }))
      );
      return res.json(enriched);
    }

    return res.status(400).json({ error: "studentId or courseId required" });
  } catch (err) {
    req.log.error({ err }, "Error fetching enrollments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) return res.status(400).json({ error: "studentId and courseId required" });

    const existing = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.studentId, studentId), eq(enrollmentsTable.courseId, courseId)));

    if (existing.length > 0) return res.status(409).json({ error: "Already enrolled" });

    const [enrollment] = await db
      .insert(enrollmentsTable)
      .values({ studentId, courseId, status: "active" })
      .returning();

    await db.update(studentsTable).set({ courseId }).where(eq(studentsTable.id, studentId));

    const [student] = await db.select({ name: studentsTable.name }).from(studentsTable).where(eq(studentsTable.id, studentId));
    const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, courseId));

    await db.insert(activityTable).values({
      type: "enrollment",
      description: `${student?.name ?? "Student"} enrolled in ${course?.title ?? "course"}`,
      studentName: student?.name ?? null,
      courseName: course?.title ?? null,
    });

    res.status(201).json(enrollment);
  } catch (err) {
    req.log.error({ err }, "Error creating enrollment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const { status } = req.body;
    const [enrollment] = await db
      .update(enrollmentsTable)
      .set({ status, ...(status === "completed" ? { completedAt: new Date() } : {}) })
      .where(eq(enrollmentsTable.id, id))
      .returning();
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });
    res.json(enrollment);
  } catch (err) {
    req.log.error({ err }, "Error updating enrollment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting enrollment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
