import { Router } from "express";
import { db } from "@workspace/db";
import { coursesTable, modulesTable, lessonsTable, studentsTable, activityTable, courseSessionsTable } from "@workspace/db";
import { eq, sql ,and } from "drizzle-orm";
import { CreateCourseBody } from "@workspace/api-zod";
import { tenantsTable } from "@workspace/db";

const router = Router();

async function getDefaultTenantId(): Promise<number> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "default"))
    .limit(1);
  if (!tenant) throw new Error("Default tenant not found.");
  return tenant.id;
}

router.get("/", async (req, res) => {
  
  try {
   const { status } = req.query;
  const tenantId = req.tenantId ?? (await getDefaultTenantId());
  const courses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.tenantId, tenantId))
    .orderBy(sql`${coursesTable.createdAt} desc`);
    const filtered = status ? courses.filter((c) => c.status === status) : courses;

    const enriched = await Promise.all(
      filtered.map(async (course) => {
        const [moduleCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(modulesTable)
          .where(eq(modulesTable.courseId, course.id));
        const [studentCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(studentsTable)
          .where(eq(studentsTable.courseId, course.id));
        return {
          id: course.id,
          title: course.title,
          titleAr: course.titleAr ?? null,
          description: course.description ?? null,
          price: Number(course.price),
          status: course.status,
          courseType: course.courseType ?? "recorded",
          thumbnailUrl: course.thumbnailUrl ?? null,
          categoryId: course.categoryId ?? null,
          level: course.level ?? null,
          language: course.language ?? null,
          totalHours: course.totalHours ? Number(course.totalHours) : null,
          isFeatured: course.isFeatured ?? false,
          studentCount: studentCount?.count ?? 0,
          moduleCount: moduleCount?.count ?? 0,
          createdAt: course.createdAt.toISOString(),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing courses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateCourseBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { title, titleAr, description, price, status, courseType, thumbnailUrl } = parsed.data;
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const [course] = await db.insert(coursesTable).values({
      title, titleAr, description, price: price.toString(),
      status, courseType, thumbnailUrl, tenantId,
    }).returning();

    await db.insert(activityTable).values({
      type: "course_created",
      description: `New course created: ${title}`,
      courseName: title,
    });

    res.status(201).json({
      id: course!.id, title: course!.title, titleAr: course!.titleAr ?? null,
      description: course!.description ?? null, price: Number(course!.price),
      status: course!.status, courseType: course!.courseType ?? "recorded",
      thumbnailUrl: course!.thumbnailUrl ?? null,
      categoryId: course!.categoryId ?? null,
      level: course!.level ?? null,
      language: course!.language ?? null,
      totalHours: course!.totalHours ? Number(course!.totalHours) : null,
      isFeatured: course!.isFeatured ?? false,
      studentCount: 0, moduleCount: 0, createdAt: course!.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/sessions", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const sessions = await db
      .select()
      .from(courseSessionsTable)
      .where(eq(courseSessionsTable.courseId, id))
      .orderBy(courseSessionsTable.order);

    res.json(sessions.map((s) => ({
      id: s.id, courseId: s.courseId, title: s.title, titleAr: s.titleAr ?? null,
      scheduledAt: s.scheduledAt.toISOString(),
      durationMinutes: s.durationMinutes,
      zoomLink: s.zoomLink ?? null, zoomPassword: s.zoomPassword ?? null,
      order: s.order,
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/sessions", async (req, res) => {
  try {
    const courseId = parseInt(req.params.id!);
    const { title, titleAr, scheduledAt, durationMinutes, zoomLink, zoomPassword, order } = req.body;

    const [session] = await db
      .insert(courseSessionsTable)
      .values({
        courseId, title, titleAr: titleAr ?? null,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes ?? 90,
        zoomLink: zoomLink ?? null, zoomPassword: zoomPassword ?? null,
        order: order ?? 0,
      })
      .returning();

    res.status(201).json({
      id: session!.id, courseId: session!.courseId, title: session!.title,
      titleAr: session!.titleAr ?? null,
      scheduledAt: session!.scheduledAt.toISOString(),
      durationMinutes: session!.durationMinutes,
      zoomLink: session!.zoomLink ?? null, zoomPassword: session!.zoomPassword ?? null,
      order: session!.order,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating session");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
    if (!course) return res.status(404).json({ error: "Course not found" });

    const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, id)).orderBy(modulesTable.order);
    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, mod.id)).orderBy(lessonsTable.order);
        return {
          id: mod.id, courseId: mod.courseId, title: mod.title, titleAr: mod.titleAr ?? null,
          order: mod.order, lessonCount: lessons.length,
          lessons: lessons.map((l) => ({
            id: l.id, moduleId: l.moduleId, title: l.title, titleAr: l.titleAr ?? null,
            type: l.type, videoUrl: l.videoUrl ?? null, pdfUrl: l.pdfUrl ?? null,
            content: l.content ?? null, duration: l.duration ?? null, order: l.order,
          })),
        };
      })
    );

    const sessions = await db
      .select()
      .from(courseSessionsTable)
      .where(eq(courseSessionsTable.courseId, id))
      .orderBy(courseSessionsTable.order);

    const [studentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentsTable)
      .where(eq(studentsTable.courseId, id));

    res.json({
      id: course.id, title: course.title, titleAr: course.titleAr ?? null,
      description: course.description ?? null, price: Number(course.price),
      status: course.status, courseType: course.courseType ?? "recorded",
      thumbnailUrl: course.thumbnailUrl ?? null,
      categoryId: course.categoryId ?? null,
      level: course.level ?? null,
      language: course.language ?? null,
      totalHours: course.totalHours ? Number(course.totalHours) : null,
      isFeatured: course.isFeatured ?? false,
      studentCount: studentCount?.count ?? 0, moduleCount: modules.length,
      createdAt: course.createdAt.toISOString(),
      modules: modulesWithLessons,
      sessions: sessions.map((s) => ({
        id: s.id, courseId: s.courseId, title: s.title, titleAr: s.titleAr ?? null,
        scheduledAt: s.scheduledAt.toISOString(),
        durationMinutes: s.durationMinutes,
        zoomLink: s.zoomLink ?? null, zoomPassword: s.zoomPassword ?? null,
        order: s.order,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const parsed = CreateCourseBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { title, titleAr, description, price, status, courseType, thumbnailUrl } = parsed.data;
    const { categoryId, level, language, totalHours, isFeatured } = req.body;

    const [course] = await db
      .update(coursesTable)
      .set({
        title, titleAr: titleAr ?? null, description: description ?? null,
        price: String(price), status,
        courseType: (courseType as "recorded" | "live") ?? "recorded",
        thumbnailUrl: thumbnailUrl ?? null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        level: level ?? null,
        language: language ?? null,
        totalHours: totalHours ? String(totalHours) : null,
        isFeatured: isFeatured ?? false,
      })
      .where(eq(coursesTable.id, id))
      .returning();

    if (!course) return res.status(404).json({ error: "Course not found" });

    const [moduleCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modulesTable)
      .where(eq(modulesTable.courseId, id));
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentsTable)
      .where(eq(studentsTable.courseId, id));

    res.json({
      id: course.id, title: course.title, titleAr: course.titleAr ?? null,
      description: course.description ?? null, price: Number(course.price),
      status: course.status, courseType: course.courseType ?? "recorded",
      thumbnailUrl: course.thumbnailUrl ?? null,
      categoryId: course.categoryId ?? null,
      level: course.level ?? null,
      language: course.language ?? null,
      totalHours: course.totalHours ? Number(course.totalHours) : null,
      isFeatured: course.isFeatured ?? false,
      studentCount: studentCount?.count ?? 0, moduleCount: moduleCount?.count ?? 0,
      createdAt: course.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    await db.delete(coursesTable).where(eq(coursesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:courseId/modules", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId!);
    const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId)).orderBy(modulesTable.order);

    const result = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, mod.id)).orderBy(lessonsTable.order);
        return {
          id: mod.id, courseId: mod.courseId, title: mod.title, titleAr: mod.titleAr ?? null,
          order: mod.order, lessonCount: lessons.length,
          lessons: lessons.map((l) => ({
            id: l.id, moduleId: l.moduleId, title: l.title, titleAr: l.titleAr ?? null,
            type: l.type, videoUrl: l.videoUrl ?? null, pdfUrl: l.pdfUrl ?? null,
            content: l.content ?? null, duration: l.duration ?? null, order: l.order,
          })),
        };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing modules");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:courseId/modules", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId!);
    const { title, titleAr, order } = req.body;

    const [mod] = await db
      .insert(modulesTable)
      .values({ courseId, title, titleAr: titleAr ?? null, order: order ?? 0 })
      .returning();

    res.status(201).json({
      id: mod!.id, courseId: mod!.courseId, title: mod!.title,
      titleAr: mod!.titleAr ?? null, order: mod!.order, lessonCount: 0, lessons: [],
    });
  } catch (err) {
    req.log.error({ err }, "Error creating module");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
