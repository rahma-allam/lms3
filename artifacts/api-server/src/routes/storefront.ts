import { Router } from "express";
import { db, modulesTable, studentsTable, lessonsTable, courseSessionsTable } from "@workspace/db";
import { coursesTable, settingsTable, categoriesTable, tenantsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

async function getDefaultTenantId(): Promise<number> {
  const slug =
    (router as any).__tenantSlug ||
    process.env.DEFAULT_TENANT_SLUG ||
    "default";
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);
  if (!tenant) throw new Error("Default tenant not found");
  return tenant.id;
}

// GET /api/storefront/settings
router.get("/settings", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const [settings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.tenantId, tenantId))
      .limit(1);
    res.json(settings ?? {});
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/storefront/courses
router.get("/courses", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const courses = await db
      .select()
      .from(coursesTable)
      .where(
        and(
          eq(coursesTable.tenantId, tenantId),
          eq(coursesTable.status, "active")
        )
      );
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/storefront/categories
router.get("/categories", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.tenantId, tenantId));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/courses/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const courseId = parseInt(req.params.id!);

    const [course] = await db
      .select()
      .from(coursesTable)
      .where(and(
        eq(coursesTable.id, courseId),
        eq(coursesTable.tenantId, tenantId),
        eq(coursesTable.status, "active")
      ));

    if (!course) return res.status(404).json({ error: "Course not found" });

    const [studentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentsTable)
      .where(and(eq(studentsTable.courseId, courseId), eq(studentsTable.tenantId, tenantId)));

    // جيب الـ modules مع الـ lessons كاملة (بما فيها videoUrl)
    const modulesRaw = await db
      .select()
      .from(modulesTable)
      .where(eq(modulesTable.courseId, courseId))
      .orderBy(modulesTable.order);

    const modules = await Promise.all(
      modulesRaw.map(async (mod) => {
        const lessons = await db
          .select({
            id: lessonsTable.id,
            title: lessonsTable.title,
            titleAr: lessonsTable.titleAr,
            type: lessonsTable.type,
            videoUrl: lessonsTable.videoUrl,
            pdfUrl: lessonsTable.pdfUrl,
            duration: lessonsTable.duration,
            order: lessonsTable.order,
          })
          .from(lessonsTable)
          .where(eq(lessonsTable.moduleId, mod.id))
          .orderBy(lessonsTable.order);

        return {
          id: mod.id,
          title: mod.title,
          titleAr: mod.titleAr ?? null,
          order: mod.order,
          lessons,
        };
      })
    );

    // جيب الجلسات لو كورس مباشر
    const sessions = course.courseType === "live"
      ? await db
          .select()
          .from(courseSessionsTable)
          .where(eq(courseSessionsTable.courseId, courseId))
          .orderBy(courseSessionsTable.scheduledAt)
      : [];

    res.json({
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
      moduleCount: modules.length,
      modules,
      sessions,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;