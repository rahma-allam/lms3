import { Router } from "express";
import { db } from "@workspace/db";
import { lessonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";

const router = Router();

// ─── مجلد تخزين الفيديوهات خارج الـ public ──────────────────────────────
const VIDEOS_DIR = path.join(process.cwd(), "private-videos");
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// ─── multer config ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: VIDEOS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("ملفات الفيديو فقط مسموح بها"));
  },
});

// ─── signed tokens في الذاكرة (استبدليها بـ Redis في Production) ─────────
const signedTokens = new Map<string, { lessonId: number; expiresAt: number }>();

// ══════════════════════════════════════════════════════════════════════════
// ⚠️ routes الـ stream لازم تجي الأول قبل /:id عشان ما يتعارضوش
// ══════════════════════════════════════════════════════════════════════════

// GET /api/lessons/stream/:token — تشغيل الفيديو بالـ token
router.get("/stream/:token", async (req, res) => {
  const { token } = req.params;
  const tokenData = signedTokens.get(token!);

  if (!tokenData || Date.now() > tokenData.expiresAt) {
    signedTokens.delete(token!);
    return res.status(403).json({ error: "الرابط منتهي الصلاحية" });
  }

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.id, tokenData.lessonId));

  if (!lesson?.videoUrl?.startsWith("local:")) {
    return res.status(404).json({ error: "الفيديو غير موجود" });
  }

  const filename = lesson.videoUrl.replace("local:", "");
  const filePath = path.join(VIDEOS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "ملف الفيديو غير موجود على السيرفر" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // دعم Range requests عشان الفيديو يشتغل بشكل صح في الـ browser
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0]!, 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store, no-cache",
      "Content-Disposition": "inline",
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store, no-cache",
      "Content-Disposition": "inline",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

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
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);

    // لو فيه فيديو محلي امسحه مع الدرس
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id));
    if (lesson?.videoUrl?.startsWith("local:")) {
      const filePath = path.join(VIDEOS_DIR, lesson.videoUrl.replace("local:", ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting lesson");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// الـ routes الجديدة للحماية
// ══════════════════════════════════════════════════════════════════════════

// POST /api/lessons/:id/upload-video — رفع فيديو
router.post("/:id/upload-video", upload.single("video"), async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id as string);

    if (!req.file) {
      return res.status(400).json({ error: "لم يتم إرسال ملف" });
    }

    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
    if (!lesson) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "الدرس غير موجود" });
    }

    // امسح الفيديو القديم لو موجود
    if (lesson.videoUrl?.startsWith("local:")) {
      const oldPath = path.join(VIDEOS_DIR, lesson.videoUrl.replace("local:", ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db
      .update(lessonsTable)
      .set({ videoUrl: `local:${req.file.filename}` })
      .where(eq(lessonsTable.id, lessonId));

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading video");
    res.status(500).json({ error: err.message || "فشل رفع الفيديو" });
  }
});

// POST /api/lessons/:id/signed-url — إنشاء رابط مؤقت للفيديو
router.post("/:id/signed-url", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);

    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
    if (!lesson?.videoUrl) {
      return res.status(404).json({ error: "الفيديو غير موجود" });
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 دقيقة

    signedTokens.set(token, { lessonId, expiresAt });
    setTimeout(() => signedTokens.delete(token), 30 * 60 * 1000);

    res.json({ url: `/api/lessons/stream/${token}` });
  } catch (err) {
    req.log.error({ err }, "Error creating signed URL");
    res.status(500).json({ error: "فشل إنشاء الرابط" });
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
// Feature 5A: PDF Upload for Lessons
// ══════════════════════════════════════════════════════════════════════════

const PDFS_DIR = path.join(process.cwd(), "private-pdfs");
if (!fs.existsSync(PDFS_DIR)) fs.mkdirSync(PDFS_DIR, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: PDFS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("PDF files only"));
  },
});

// Signed tokens for PDF
const pdfTokens = new Map<string, { lessonId: number; expiresAt: number }>();

// GET /api/lessons/pdf/:token — serve PDF with signed token
router.get("/pdf/:token", async (req, res) => {
  const { token } = req.params;
  const tokenData = pdfTokens.get(token!);

  if (!tokenData || Date.now() > tokenData.expiresAt) {
    pdfTokens.delete(token!);
    return res.status(403).json({ error: "Link expired" });
  }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, tokenData.lessonId));
  if (!lesson?.pdfUrl?.startsWith("local:")) {
    return res.status(404).json({ error: "PDF not found" });
  }

  const filename = lesson.pdfUrl.replace("local:", "");
  const filePath = path.join(PDFS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "PDF file not found on server" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");
  fs.createReadStream(filePath).pipe(res);
});

// POST /api/lessons/:id/upload-pdf — upload PDF
router.post("/:id/upload-pdf", uploadPdf.single("pdf"), async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id as string);
    if (!req.file) return res.status(400).json({ error: "No file sent" });

    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
    if (!lesson) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Delete old PDF if exists
    if (lesson.pdfUrl?.startsWith("local:")) {
      const oldPath = path.join(PDFS_DIR, lesson.pdfUrl.replace("local:", ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const pdfUrl = `local:${req.file.filename}`;
    await db.update(lessonsTable).set({ pdfUrl, type: "pdf" }).where(eq(lessonsTable.id, lessonId));

    res.json({ success: true, pdfUrl });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading PDF");
    res.status(500).json({ error: err.message || "Failed to upload PDF" });
  }
});

// POST /api/lessons/:id/pdf-signed-url — generate signed URL for PDF
router.post("/:id/pdf-signed-url", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id!);
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
    if (!lesson?.pdfUrl?.startsWith("local:")) {
      return res.status(404).json({ error: "PDF not found" });
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 60 * 1000;
    pdfTokens.set(token, { lessonId, expiresAt });
    setTimeout(() => pdfTokens.delete(token), 30 * 60 * 1000);

    res.json({ url: `/api/lessons/pdf/${token}` });
  } catch (err) {
    req.log.error({ err }, "Error creating PDF signed URL");
    res.status(500).json({ error: "Failed to create signed URL" });
  }
});

export default router;