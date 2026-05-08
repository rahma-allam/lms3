import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, paymentsTable, coursesTable, activityTable, tenantsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreateStudentBody } from "@workspace/api-zod";

const router = Router();

async function getDefaultTenantId(): Promise<number> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "default"))
    .limit(1);
  if (!tenant) throw new Error("Default tenant not found. Run the migration first.");
  return tenant.id;
}

router.get("/", async (req, res) => {
  try {
    const { courseId, status, paymentStatus, search } = req.query;
    const tenantId = req.tenantId ?? (await getDefaultTenantId());

    let students = await db
      .select({
        student: studentsTable,
        courseName: coursesTable.title,
      })
      .from(studentsTable)
      .leftJoin(coursesTable, eq(studentsTable.courseId, coursesTable.id))
      .where(eq(studentsTable.tenantId, tenantId))
      .orderBy(sql`${studentsTable.enrolledAt} desc`);

    if (courseId) students = students.filter((s) => s.student.courseId === parseInt(courseId as string));
    if (status) students = students.filter((s) => s.student.status === status);
    if (paymentStatus) students = students.filter((s) => s.student.paymentStatus === paymentStatus);
    if (search) {
      const q = (search as string).toLowerCase();
      students = students.filter(
        (s) => s.student.name.toLowerCase().includes(q) || s.student.email.toLowerCase().includes(q)
      );
    }

    res.json(
      students.map(({ student, courseName }) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone ?? null,
        status: student.status,
        courseId: student.courseId ?? null,
        courseName: courseName ?? null,
        paymentStatus: student.paymentStatus,
        progress: Number(student.progress),
        enrolledAt: student.enrolledAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateStudentBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { name, email, phone, courseId, status, paymentStatus } = parsed.data;
    const tenantId = req.tenantId ?? (await getDefaultTenantId());

    // Check email uniqueness within tenant
    const [existing] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.email, email), eq(studentsTable.tenantId, tenantId)))
      .limit(1);
    if (existing) {
      return res.status(409).json({ error: "A student with this email already exists in this academy" });
    }

    const [student] = await db
      .insert(studentsTable)
      .values({ name, email, phone: phone ?? null, courseId: courseId ?? null, status, paymentStatus, tenantId })
      .returning();

    let courseName: string | null = null;
    if (student!.courseId) {
      const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, student!.courseId));
      courseName = course?.title ?? null;
    }

    await db.insert(activityTable).values({
      tenantId,
      type: "enrollment",
      description: `${name} enrolled${courseName ? ` in ${courseName}` : ""}`,
      studentName: name,
      courseName: courseName ?? undefined,
    });

    res.status(201).json({
      id: student!.id,
      name: student!.name,
      email: student!.email,
      phone: student!.phone ?? null,
      status: student!.status,
      courseId: student!.courseId ?? null,
      courseName,
      paymentStatus: student!.paymentStatus,
      progress: Number(student!.progress),
      enrolledAt: student!.enrolledAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const tenantId = req.tenantId ?? (await getDefaultTenantId());

    const [result] = await db
      .select({ student: studentsTable, courseName: coursesTable.title })
      .from(studentsTable)
      .leftJoin(coursesTable, eq(studentsTable.courseId, coursesTable.id))
      .where(and(eq(studentsTable.id, id), eq(studentsTable.tenantId, tenantId)));

    if (!result) return res.status(404).json({ error: "Student not found" });

    const payments = await db
      .select({ payment: paymentsTable, courseName: coursesTable.title })
      .from(paymentsTable)
      .leftJoin(coursesTable, eq(paymentsTable.courseId, coursesTable.id))
      .where(eq(paymentsTable.studentId, id))
      .orderBy(sql`${paymentsTable.createdAt} desc`);

    const { student, courseName } = result;

    res.json({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone ?? null,
      status: student.status,
      courseId: student.courseId ?? null,
      courseName: courseName ?? null,
      paymentStatus: student.paymentStatus,
      progress: Number(student.progress),
      enrolledAt: student.enrolledAt.toISOString(),
      payments: payments.map(({ payment, courseName: cn }) => ({
        id: payment.id,
        studentId: payment.studentId,
        studentName: student.name,
        courseId: payment.courseId ?? null,
        courseName: cn ?? null,
        amount: Number(payment.amount),
        status: payment.status,
        method: payment.method,
        notes: payment.notes ?? null,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const tenantId = req.tenantId ?? (await getDefaultTenantId());

    const parsed = CreateStudentBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { name, email, phone, courseId, status, paymentStatus } = parsed.data;

    // Ensure student belongs to this tenant
    const [existing] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, id), eq(studentsTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "Student not found" });

    const [student] = await db
      .update(studentsTable)
      .set({ name, email, phone: phone ?? null, courseId: courseId ?? null, status, paymentStatus })
      .where(and(eq(studentsTable.id, id), eq(studentsTable.tenantId, tenantId)))
      .returning();

    if (!student) return res.status(404).json({ error: "Student not found" });

    let courseName: string | null = null;
    if (student.courseId) {
      const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, student.courseId));
      courseName = course?.title ?? null;
    }

    res.json({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone ?? null,
      status: student.status,
      courseId: student.courseId ?? null,
      courseName,
      paymentStatus: student.paymentStatus,
      progress: Number(student.progress),
      enrolledAt: student.enrolledAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating student");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const tenantId = req.tenantId ?? (await getDefaultTenantId());

    // Ensure student belongs to this tenant
    const [existing] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, id), eq(studentsTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "Student not found" });

    await db.delete(studentsTable).where(and(eq(studentsTable.id, id), eq(studentsTable.tenantId, tenantId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting student");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/students/:id/progress-detail
router.get("/:id/progress-detail", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { modulesTable, lessonsTable, lessonCompletionsTable, quizAttemptsTable, quizzesTable } = await import("@workspace/db");

    const [result] = await db
      .select({ student: studentsTable, courseTitle: coursesTable.title })
      .from(studentsTable)
      .leftJoin(coursesTable, eq(studentsTable.courseId, coursesTable.id))
      .where(and(eq(studentsTable.id, id), eq(studentsTable.tenantId, tenantId)));

    if (!result) return res.status(404).json({ error: "Student not found" });

    const { student, courseTitle } = result;
    if (!student.courseId) return res.json({ enrolled: false });

    const modules = await db
      .select()
      .from(modulesTable)
      .where(eq(modulesTable.courseId, student.courseId))
      .orderBy(modulesTable.order);

    const allLessons = await db
      .select()
      .from(lessonsTable)
      .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
      .where(eq(modulesTable.courseId, student.courseId))
      .orderBy(lessonsTable.order);

    const completions = await db
      .select({ lessonId: lessonCompletionsTable.lessonId })
      .from(lessonCompletionsTable)
      .where(eq(lessonCompletionsTable.studentId, id));
    const completedIds = new Set(completions.map((c) => c.lessonId));

    const attempts = await db
      .select({
        quizId: quizAttemptsTable.quizId,
        score: quizAttemptsTable.score,
        passed: quizAttemptsTable.passed,
        submittedAt: quizAttemptsTable.submittedAt,
        lessonId: quizzesTable.lessonId,
      })
      .from(quizAttemptsTable)
      .innerJoin(quizzesTable, eq(quizAttemptsTable.quizId, quizzesTable.id))
      .where(eq(quizAttemptsTable.studentId, id))
      .orderBy(sql`${quizAttemptsTable.submittedAt} desc`);

    const attemptByLesson = new Map<number, { score: number; passed: boolean; submittedAt: string }>();
    for (const a of attempts) {
      if (!attemptByLesson.has(a.lessonId)) {
        attemptByLesson.set(a.lessonId, {
          score: a.score,
          passed: a.passed,
          submittedAt: a.submittedAt.toISOString(),
        });
      }
    }

    const lessonsByModule = new Map<number, typeof allLessons>();
    for (const row of allLessons) {
      const arr = lessonsByModule.get(row.lessons.moduleId) ?? [];
      arr.push(row);
      lessonsByModule.set(row.lessons.moduleId, arr);
    }

    const modulesResult = modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      titleAr: mod.titleAr ?? null,
      lessons: (lessonsByModule.get(mod.id) ?? []).map((row) => ({
        id: row.lessons.id,
        title: row.lessons.title,
        titleAr: row.lessons.titleAr ?? null,
        type: row.lessons.type,
        order: row.lessons.order,
        completed: completedIds.has(row.lessons.id),
        quizAttempt: attemptByLesson.get(row.lessons.id) ?? null,
      })),
    }));

    const totalLessons = allLessons.length;
    const completedLessons = completedIds.size;

    res.json({
      enrolled: true,
      courseId: student.courseId,
      courseTitle: courseTitle ?? "",
      overallProgress: Number(student.progress),
      totalLessons,
      completedLessons,
      modules: modulesResult,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching student progress detail");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;