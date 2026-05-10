import bcrypt from "bcryptjs";
import { Router } from "express";
import { coursesTable, db } from "@workspace/db";
import {
  instructorsTable,
  courseInstructorsTable,
  messagesTable,
  messageAttachmentsTable,
} from "@workspace/db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";

const router = Router();

const ATTACHMENTS_DIR = path.join(process.cwd(), "private-attachments");
if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

const attachmentStorage = multer.diskStorage({
  destination: ATTACHMENTS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ══════════════════════════════════════════════════════════════
// المدربين
// ══════════════════════════════════════════════════════════════

router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const instructors = await db
      .select({
        id: instructorsTable.id,
        name: instructorsTable.name,
        nameAr: instructorsTable.nameAr,
        email: instructorsTable.email,
        phone: instructorsTable.phone,
        bio: instructorsTable.bio,
        bioAr: instructorsTable.bioAr,
        avatarUrl: instructorsTable.avatarUrl,
        isActive: instructorsTable.isActive,
        createdAt: instructorsTable.createdAt,
      })
      .from(instructorsTable)
      .where(eq(instructorsTable.tenantId, tenantId))
      .orderBy(desc(instructorsTable.createdAt));

    res.json(instructors);
  } catch (err) {
    req.log.error({ err }, "Error listing instructors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const { name, nameAr, email, phone, bio, bioAr, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "الاسم والإيميل وكلمة السر مطلوبين" });

    const hashed = await bcrypt.hash(password, 10);

    const [instructor] = await db
      .insert(instructorsTable)
      .values({
        tenantId,
        name, nameAr: nameAr ?? null, email,
        password: hashed, phone: phone ?? null,
        bio: bio ?? null, bioAr: bioAr ?? null,
      })
      .returning({
        id: instructorsTable.id,
        name: instructorsTable.name,
        nameAr: instructorsTable.nameAr,
        email: instructorsTable.email,
        phone: instructorsTable.phone,
        bio: instructorsTable.bio,
        bioAr: instructorsTable.bioAr,
        avatarUrl: instructorsTable.avatarUrl,
        isActive: instructorsTable.isActive,
        createdAt: instructorsTable.createdAt,
      });

    res.status(201).json(instructor);
  } catch (err: any) {
    if (err.code === "23505")
      return res.status(400).json({ error: "الإيميل مستخدم بالفعل" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const id = parseInt(req.params.id!);
    const { name, nameAr, email, phone, bio, bioAr, isActive, password } = req.body;

    const updateData: Record<string, any> = {
      name, nameAr: nameAr ?? null, email,
      phone: phone ?? null, bio: bio ?? null,
      bioAr: bioAr ?? null, isActive,
    };

    if (password && password.trim() !== "") {
      updateData["password"] = await bcrypt.hash(password, 10);
    }

    const [instructor] = await db
      .update(instructorsTable)
      .set(updateData)
      .where(and(
        eq(instructorsTable.id, id),
        eq(instructorsTable.tenantId, tenantId)
      ))
      .returning({
        id: instructorsTable.id,
        name: instructorsTable.name,
        nameAr: instructorsTable.nameAr,
        email: instructorsTable.email,
        phone: instructorsTable.phone,
        bio: instructorsTable.bio,
        bioAr: instructorsTable.bioAr,
        avatarUrl: instructorsTable.avatarUrl,
        isActive: instructorsTable.isActive,
        createdAt: instructorsTable.createdAt,
      });

    if (!instructor) return res.status(404).json({ error: "المدرب غير موجود" });
    res.json(instructor);
  } catch (err) {
    req.log.error({ err }, "Error updating instructor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const id = parseInt(req.params.id!);
    await db.delete(instructorsTable).where(and(
      eq(instructorsTable.id, id),
      eq(instructorsTable.tenantId, tenantId)
    ));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting instructor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/assign-course", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const instructorId = parseInt(req.params.id!);
    const { courseId } = req.body;

    // تأكد إن المدرب والكورس تابعين لنفس الأكاديمية
    const [instructor] = await db.select().from(instructorsTable)
      .where(and(eq(instructorsTable.id, instructorId), eq(instructorsTable.tenantId, tenantId)));
    if (!instructor) return res.status(404).json({ error: "المدرب غير موجود" });

    const [existing] = await db.select().from(courseInstructorsTable)
      .where(and(
        eq(courseInstructorsTable.instructorId, instructorId),
        eq(courseInstructorsTable.courseId, courseId)
      ));
    if (existing) return res.status(400).json({ error: "المدرب مسند للكورس ده بالفعل" });

    const [assignment] = await db
      .insert(courseInstructorsTable)
      .values({ instructorId, courseId })
      .returning();

    res.status(201).json(assignment);
  } catch (err) {
    req.log.error({ err }, "Error assigning course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/unassign-course", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const instructorId = parseInt(req.params.id!);
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: "courseId is required" });

    // تأكد إن المدرب تابع لنفس الأكاديمية
    const [instructor] = await db.select().from(instructorsTable)
      .where(and(eq(instructorsTable.id, instructorId), eq(instructorsTable.tenantId, tenantId)));
    if (!instructor) return res.status(404).json({ error: "المدرب غير موجود" });

    await db.delete(courseInstructorsTable).where(and(
      eq(courseInstructorsTable.instructorId, instructorId),
      eq(courseInstructorsTable.courseId, courseId)
    ));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error unassigning course");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/courses", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Academy not found" });

    const id = parseInt(req.params.id!);
    const courses = await db
      .select({
        id: coursesTable.id,
        title: coursesTable.title,
        titleAr: coursesTable.titleAr,
        courseType: coursesTable.courseType,
        status: coursesTable.status,
      })
      .from(courseInstructorsTable)
      .innerJoin(coursesTable, eq(courseInstructorsTable.courseId, coursesTable.id))
      .where(and(
        eq(courseInstructorsTable.instructorId, id),
        eq(coursesTable.tenantId, tenantId)
      ));

    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error fetching instructor courses");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ══════════════════════════════════════════════════════════════
// الشات
// ══════════════════════════════════════════════════════════════

router.get("/chat/:courseId", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const { since } = req.query;

    const messages = await db
      .select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.courseId, courseId),
        isNull(messagesTable.recipientStudentId),
        since ? sql`${messagesTable.createdAt} > ${new Date(since as string)}` : undefined
      ))
      .orderBy(messagesTable.createdAt)
      .limit(100);

    const withAttachments = await Promise.all(
      messages.map(async (msg) => {
        const attachments = await db.select().from(messageAttachmentsTable)
          .where(eq(messageAttachmentsTable.messageId, msg.id));
        return { ...msg, attachments };
      })
    );

    res.json(withAttachments);
  } catch (err) {
    req.log.error({ err }, "Error fetching messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chat/:courseId/private/:studentId", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const studentId = parseInt(req.params.studentId!);
    const { since } = req.query;

    const messages = await db
      .select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.courseId, courseId),
        eq(messagesTable.recipientStudentId, studentId),
        since ? sql`${messagesTable.createdAt} > ${new Date(since as string)}` : undefined
      ))
      .orderBy(messagesTable.createdAt)
      .limit(100);

    const withAttachments = await Promise.all(
      messages.map(async (msg) => {
        const attachments = await db.select().from(messageAttachmentsTable)
          .where(eq(messageAttachmentsTable.messageId, msg.id));
        return { ...msg, attachments };
      })
    );

    res.json(withAttachments);
  } catch (err) {
    req.log.error({ err }, "Error fetching private messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chat/:courseId", uploadAttachment.array("attachments", 5), async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const { senderType, senderId, senderName, content, recipientStudentId } = req.body;

    if (!senderType || !senderId || !senderName)
      return res.status(400).json({ error: "بيانات المُرسِل مطلوبة" });

    if (senderType === "instructor") {
      const [assigned] = await db.select().from(courseInstructorsTable)
        .where(and(
          eq(courseInstructorsTable.instructorId, parseInt(senderId)),
          eq(courseInstructorsTable.courseId, courseId)
        ));
      if (!assigned)
        return res.status(403).json({ error: "غير مصرح لك بالكتابة في هذا الكورس" });
    }

    const files = req.files as Express.Multer.File[];
    if (!content && !files?.length)
      return res.status(400).json({ error: "الرسالة فاضية" });

    const [message] = await db
      .insert(messagesTable)
      .values({
        courseId,
        senderType,
        senderId: parseInt(senderId),
        senderName,
        content: content || null,
        recipientStudentId: recipientStudentId ? parseInt(recipientStudentId) : null,
      })
      .returning();

    const attachments = [];
    for (const file of files ?? []) {
      const [att] = await db
        .insert(messageAttachmentsTable)
        .values({
          messageId: message!.id,
          filename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
        })
        .returning();
      attachments.push(att);
    }

    res.status(201).json({ ...message, attachments });
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attachments/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const [attachment] = await db.select().from(messageAttachmentsTable)
      .where(eq(messageAttachmentsTable.storedFilename, filename!));
    if (!attachment) return res.status(404).json({ error: "الملف غير موجود" });

    const filePath = path.join(ATTACHMENTS_DIR, filename!);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "الملف غير موجود" });

    res.setHeader("Content-Disposition", `inline; filename="${attachment.filename}"`);
    res.setHeader("Content-Type", attachment.mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    req.log.error({ err }, "Error serving attachment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;