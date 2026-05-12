import { Router } from "express";
import { db } from "@workspace/db";
import { lessonsTable, modulesTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateUploadSignature, deleteFromCloudinary, extractPublicId, uploadToCloudinary } from "../lib/cloudinary.js";
import multer from "multer";

const router = Router();

// ─── helper: تحقق أن الـ lesson ينتمي لـ tenant معين ────────────────────
// lesson → module → course → tenant
async function getLessonWithTenantCheck(lessonId: number, tenantId: number | undefined) {
  const rows = await db
    .select({ lesson: lessonsTable, tenantId: coursesTable.tenantId })
    .from(lessonsTable)
    .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
    .innerJoin(coursesTable, eq(modulesTable.courseId, coursesTable.id))
    .where(eq(lessonsTable.id, lessonId));

  const row = rows[0];
  if (!row) return null; // الدرس مش موجود

  // لو tenantId موجود في الـ request تحقق منه — لو مش موجود اسمح (dev/fallback)
  if (tenantId !== undefined && row.tenantId !== tenantId) return null;

  return row.lesson;
}



// ══════════════════════════════════════════════════════════════════════════
// ملاحظة: بعد Cloudinary مفيش حاجة اسمها stream/:token
// الفيديو بيتشال مباشرةً من رابط Cloudinary المحفوظ في videoUrl
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// الـ routes الأصلية (موجودة قبل كده)
// ══════════════════════════════════════════════════════════════════════════

// GET /api/modules/:moduleId/lessons
router.get("/:moduleId/lessons", async (req, res) => {
  try {
    const moduleId = parseInt(req.params.moduleId!);
    const lessons = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.moduleId, moduleId))
      .orderBy(lessonsTable.order);

    res.json(lessons.map((l) => ({
      id: l.id,
      moduleId: l.moduleId,
      title: l.title,
      titleAr: l.titleAr ?? null,
      type: l.type,
      videoUrl: l.videoUrl ?? null,
      pdfUrl: l.pdfUrl ?? null,
      content: l.content ?? null,
      duration: l.duration ?? null,
      order: l.order,
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing lessons");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/modules/:moduleId/lessons
router.post("/:moduleId/lessons", async (req, res) => {
  try {
    const moduleId = parseInt(req.params.moduleId!);
    const { title, titleAr, type, videoUrl, pdfUrl, content, duration, order } = req.body;

    const [lesson] = await db
      .insert(lessonsTable)
      .values({
        moduleId, title,
        titleAr: titleAr ?? null,
        type: type ?? "video",
        videoUrl: videoUrl ?? null,
        pdfUrl: pdfUrl ?? null,
        content: content ?? null,
        duration: duration ?? null,
        order: order ?? 0,
      })
      .returning();

    res.status(201).json({
      id: lesson!.id,
      moduleId: lesson!.moduleId,
      title: lesson!.title,
      titleAr: lesson!.titleAr ?? null,
      type: lesson!.type,
      videoUrl: lesson!.videoUrl ?? null,
      pdfUrl: lesson!.pdfUrl ?? null,
      content: lesson!.content ?? null,
      duration: lesson!.duration ?? null,
      order: lesson!.order,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});


// ══════════════════════════════════════════════════════════════════════════
// الـ routes الجديدة للحماية
// ══════════════════════════════════════════════════════════════════════════

// POST /api/lessons/:id/upload-video-signature — يولد signature للرفع المباشر من المتصفح
// المتصفح يرفع مباشرةً لـ Cloudinary بدون ما الفيديو يعدي على السيرفر
router.post("/:id/upload-video-signature", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);
    const lesson = await getLessonWithTenantCheck(lessonId, req.tenantId);
    if (!lesson) return res.status(404).json({ error: "الدرس غير موجود أو لا تملك صلاحية الوصول إليه" });

    const signature = generateUploadSignature("lms/videos", "video");
    res.json(signature);
  } catch (err: any) {
    req.log.error({ err }, "Error generating upload signature");
    res.status(500).json({ 
      error: "فشل توليد رابط الرفع",
      detail: err?.message ?? String(err),
    });
  }
});

// POST /api/lessons/:id/confirm-video — بعد ما المتصفح يرفع مباشرةً لـ Cloudinary يبعت الـ URL هنا
router.post("/:id/confirm-video", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);
    const { videoUrl } = req.body as { videoUrl: string };

    if (!videoUrl?.startsWith("https://res.cloudinary.com/")) {
      return res.status(400).json({ error: "رابط غير صالح" });
    }

    const lesson = await getLessonWithTenantCheck(lessonId, req.tenantId);
    if (!lesson) return res.status(404).json({ error: "الدرس غير موجود أو لا تملك صلاحية الوصول إليه" });

    // احذف الفيديو القديم لو موجود
    if (lesson.videoUrl && !lesson.videoUrl.startsWith("local:")) {
      const oldPublicId = extractPublicId(lesson.videoUrl);
      if (oldPublicId) await deleteFromCloudinary(oldPublicId, "video");
    }

    await db.update(lessonsTable).set({ videoUrl }).where(eq(lessonsTable.id, lessonId));
    res.json({ success: true, videoUrl });
  } catch (err: any) {
    req.log.error({ err }, "Error confirming video");
    res.status(500).json({ error: "فشل تأكيد الفيديو" });
  }
});

// POST /api/lessons/:id/signed-url — الفيديو على Cloudinary مش محتاج signed-url
// بس نحتفظ بالـ endpoint للـ backward compatibility
router.post("/:id/signed-url", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);
    const lesson = await getLessonWithTenantCheck(lessonId, req.tenantId);

    if (!lesson?.videoUrl) {
      return res.status(404).json({ error: "الفيديو غير موجود" });
    }

    if (lesson.videoUrl.startsWith("local:")) {
      return res.status(410).json({ error: "الفيديو القديم مش متاح، ارفعه مرة تانية" });
    }

    res.json({ url: lesson.videoUrl });
  } catch (err) {
    req.log.error({ err }, "Error fetching video URL");
    res.status(500).json({ error: "فشل جلب رابط الفيديو" });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// Feature 1: Lesson Completion & Progress Tracking
// ══════════════════════════════════════════════════════════════════════════

// POST /api/lessons/:id/complete
router.post("/:id/complete", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "studentId is required" });

    const { lessonCompletionsTable, studentsTable, modulesTable, activityTable } = await import("@workspace/db");
    const { sql: sqlHelper } = await import("drizzle-orm");

    // 1. Insert completion (ignore if already exists)
    await db.execute(
      sqlHelper`INSERT INTO lesson_completions (student_id, lesson_id) VALUES (${studentId}, ${lessonId}) ON CONFLICT DO NOTHING`
    );

    // 2. Get the lesson's module to find the course
    const [lessonRow] = await db
      .select({ moduleId: lessonsTable.moduleId })
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId));
    if (!lessonRow) return res.status(404).json({ error: "Lesson not found" });

    const [moduleRow] = await db
      .select({ courseId: modulesTable.courseId })
      .from(modulesTable)
      .where(eq(modulesTable.id, lessonRow.moduleId));
    if (!moduleRow) return res.status(404).json({ error: "Module not found" });

    const { coursesTable } = await import("@workspace/db");

    // 3. Count total lessons in this course
    const [{ total }] = await db
      .select({ total: sqlHelper<number>`count(*)::int` })
      .from(lessonsTable)
      .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
      .where(eq(modulesTable.courseId, moduleRow.courseId));

    // 4. Count completed lessons for this student in this course
    const [{ completed }] = await db
      .select({ completed: sqlHelper<number>`count(*)::int` })
      .from(lessonCompletionsTable)
      .innerJoin(lessonsTable, eq(lessonCompletionsTable.lessonId, lessonsTable.id))
      .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
      .where(
        sqlHelper`${lessonCompletionsTable.studentId} = ${studentId} AND ${modulesTable.courseId} = ${moduleRow.courseId}`
      );

    // 5. Calculate and update progress
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await db
      .update(studentsTable)
      .set({ progress: progress.toString() })
      .where(eq(studentsTable.id, studentId));

    // 6. Insert activity record
    await db.insert(activityTable).values({
      type: "lesson_completed",
      description: "Student completed a lesson",
      relatedId: lessonId,
    });

    res.json({ success: true, progress, completedLessons: completed, totalLessons: total });
  } catch (err) {
    req.log.error({ err }, "Error completing lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// Feature 5A: PDF Upload for Lessons — على Cloudinary
// ══════════════════════════════════════════════════════════════════════════

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("PDF files only"));
  },
});

// GET /api/lessons/pdf/:token — لم يعد مطلوباً مع Cloudinary، نحتفظ به للـ backward compatibility
router.get("/pdf/:token", (_req, res) => {
  res.status(410).json({ error: "هذا الـ endpoint لم يعد مستخدماً، الـ PDF يُقرأ من رابط Cloudinary مباشرةً" });
});

// POST /api/lessons/:id/upload-pdf — upload PDF على Cloudinary
router.post("/:id/upload-pdf", uploadPdf.single("pdf"), async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id as string);
    if (!req.file) return res.status(400).json({ error: "No file sent" });

    const lesson = await getLessonWithTenantCheck(lessonId, req.tenantId);
    if (!lesson) return res.status(404).json({ error: "الدرس غير موجود أو لا تملك صلاحية الوصول إليه" });

    // احذف الـ PDF القديم من Cloudinary
    if (lesson.pdfUrl && !lesson.pdfUrl.startsWith("local:")) {
      const oldPublicId = extractPublicId(lesson.pdfUrl);
      if (oldPublicId) await deleteFromCloudinary(oldPublicId, "raw");
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "lms/pdfs",
      resource_type: "raw",
    });

    await db.update(lessonsTable)
      .set({ pdfUrl: result.secure_url, type: "pdf" })
      .where(eq(lessonsTable.id, lessonId));

    res.json({ success: true, pdfUrl: result.secure_url });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading PDF");
    res.status(500).json({ error: err.message || "Failed to upload PDF" });
  }
});

// POST /api/lessons/:id/pdf-signed-url — ارجع رابط Cloudinary مباشرةً
router.post("/:id/pdf-signed-url", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);
    const lesson = await getLessonWithTenantCheck(lessonId, req.tenantId);

    if (!lesson?.pdfUrl) {
      return res.status(404).json({ error: "PDF not found" });
    }

    if (lesson.pdfUrl.startsWith("local:")) {
      return res.status(410).json({ error: "الـ PDF القديم مش متاح، ارفعه مرة تانية" });
    }

    res.json({ url: lesson.pdfUrl });
  } catch (err) {
    req.log.error({ err }, "Error fetching PDF URL");
    res.status(500).json({ error: "Failed to fetch PDF URL" });
  }
});


// PUT /api/lessons/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const { title, titleAr, type, videoUrl, pdfUrl, content, duration, order } = req.body;

    const [lesson] = await db
      .update(lessonsTable)
      .set({
        title, titleAr: titleAr ?? null, type,
        videoUrl: videoUrl ?? null, pdfUrl: pdfUrl ?? null,
        content: content ?? null, duration: duration ?? null, order,
      })
      .where(eq(lessonsTable.id, id))
      .returning();

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    res.json({
      id: lesson.id, moduleId: lesson.moduleId, title: lesson.title,
      titleAr: lesson.titleAr ?? null, type: lesson.type,
      videoUrl: lesson.videoUrl ?? null, pdfUrl: lesson.pdfUrl ?? null,
      content: lesson.content ?? null, duration: lesson.duration ?? null,
      order: lesson.order,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/lessons/:id

// DELETE /api/lessons/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);

    // تحقق من tenant قبل الحذف
    const lesson = await getLessonWithTenantCheck(id, req.tenantId);
    if (!lesson) return res.status(404).json({ error: "الدرس غير موجود أو لا تملك صلاحية حذفه" });

    // احذف الفيديو والـ PDF من Cloudinary لو موجودين
    if (lesson?.videoUrl && !lesson.videoUrl.startsWith("local:")) {
      const publicId = extractPublicId(lesson.videoUrl);
      if (publicId) await deleteFromCloudinary(publicId, "video");
    }
    if (lesson?.pdfUrl && !lesson.pdfUrl.startsWith("local:")) {
      const publicId = extractPublicId(lesson.pdfUrl);
      if (publicId) await deleteFromCloudinary(publicId, "raw");
    }

    await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;