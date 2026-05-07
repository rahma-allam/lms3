import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, studentsTable, coursesTable, activityTable, settingsTable, enrollmentsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreatePaymentBody } from "@workspace/api-zod";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import { firePurchaseConversions } from "../lib/conversionApi.js";

const router = Router();

// ─── مجلد تخزين إيصالات الدفع ────────────────────────────────────────────
const RECEIPTS_DIR = path.join(process.cwd(), "private-receipts");
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const receiptStorage = multer.diskStorage({
  destination: RECEIPTS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Image files only"));
  },
});

// 1. ملخص المدفوعات (Summary)
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [stats] = await db
      .select({
        total: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where ${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved'), 0)`,
        pending: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where ${paymentsTable.status} = 'pending'), 0)`,
        thisMonth: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where (${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved') and ${paymentsTable.createdAt} >= ${startOfMonth}), 0)`,
        lastMonth: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where (${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved') and ${paymentsTable.createdAt} >= ${startOfLastMonth} and ${paymentsTable.createdAt} <= ${endOfLastMonth}), 0)`,
        totalCount: sql<number>`count(*)::int`,
        completedCount: sql<number>`count(*) filter (where ${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved')::int`,
        pendingCount: sql<number>`count(*) filter (where ${paymentsTable.status} = 'pending')::int`,
      })
      .from(paymentsTable);

    res.json({
      totalRevenue: Number(stats?.total ?? 0),
      pendingRevenue: Number(stats?.pending ?? 0),
      thisMonthRevenue: Number(stats?.thisMonth ?? 0),
      lastMonthRevenue: Number(stats?.lastMonth ?? 0),
      totalTransactions: stats?.totalCount ?? 0,
      completedTransactions: stats?.completedCount ?? 0,
      pendingTransactions: stats?.pendingCount ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching payment summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. قائمة المدفوعات
router.get("/", async (req, res) => {
  try {
    const { status, studentId } = req.query;

    let query = db
      .select({
        payment: paymentsTable,
        studentName: studentsTable.name,
        courseName: coursesTable.title,
      })
      .from(paymentsTable)
      .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .leftJoin(coursesTable, eq(paymentsTable.courseId, coursesTable.id))
      .orderBy(sql`${paymentsTable.createdAt} desc`);

    let payments = await query;

    if (status) payments = payments.filter((p) => p.payment.status === status);
    if (studentId) payments = payments.filter((p) => p.payment.studentId === parseInt(studentId as string));

    res.json(
      payments.map(({ payment, studentName, courseName }) => ({
        id: payment.id,
        studentId: payment.studentId,
        studentName: studentName ?? null,
        courseId: payment.courseId ?? null,
        courseName: courseName ?? null,
        amount: Number(payment.amount),
        status: payment.status,
        method: payment.method,
        receiptUrl: payment.receiptUrl ?? null,
        notes: payment.notes ?? null,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. إنشاء عملية دفع جديدة (يدوي - حالة pending)
router.post("/", async (req, res) => {
  try {
    const parsed = CreatePaymentBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { studentId, courseId, amount, status, method, notes, paidAt } = parsed.data;
    const receiptUrl = (req.body as any).receiptUrl ?? null;

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        studentId,
        courseId: courseId ?? null,
        amount: String(amount),
        status: status || "pending",
        method,
        receiptUrl,
        notes: notes ?? null,
        paidAt: paidAt ? new Date(paidAt as string) : null,
      })
      .returning();

    const [student] = await db.select({ name: studentsTable.name, email: studentsTable.email, phone: studentsTable.phone }).from(studentsTable).where(eq(studentsTable.id, studentId));

    // إذا تم الدفع بنجاح فوراً (مثلاً بطاقة ائتمانية)
    if (status === "completed" || status === "approved") {
      await db.update(studentsTable).set({ paymentStatus: "paid" }).where(eq(studentsTable.id, studentId));

      await db.insert(activityTable).values({
        type: "payment",
        description: `Payment of $${amount} received from ${student?.name ?? "student"}`,
        studentName: student?.name ?? null,
        amount: String(amount),
      });

      const [settingsRow] = await db.select().from(settingsTable).limit(1);
      if (settingsRow) {
        firePurchaseConversions(
          settingsRow,
          {
            orderId: String(payment!.id),
            value: amount,
            currency: settingsRow.currency,
            email: student?.email,
            phone: student?.phone,
            clientIp: req.ip,
            userAgent: req.headers["user-agent"],
          },
          req.log
        );
      }
    }

    res.status(201).json({
      ...payment,
      amount: Number(payment!.amount),
      studentName: student?.name ?? null
    });
  } catch (err) {
    req.log.error({ err }, "Error creating payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. دفع أونلاين (يتم تلقائياً)
// POST /api/payments/online
router.post("/online", async (req, res) => {
  try {
    const { studentId, courseId, amount } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({ error: "studentId and amount are required" });
    }

    // محاكاة الدفع الناجح
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        studentId: parseInt(studentId),
        courseId: courseId ? parseInt(courseId) : null,
        amount: String(amount),
        status: "completed",
        method: "online",
        paidAt: new Date(),
      })
      .returning();

    // تفعيل الكورس للطالب فوراً
    await db.update(studentsTable)
      .set({ paymentStatus: "paid", status: "active", ...(courseId ? { courseId: parseInt(courseId) } : {}) })
      .where(eq(studentsTable.id, parseInt(studentId)));

    if (courseId) {
      const sid = parseInt(studentId);
      const cid = parseInt(courseId);
      const existing = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.studentId, sid), eq(enrollmentsTable.courseId, cid)));
      if (existing.length === 0) {
        await db.insert(enrollmentsTable).values({ studentId: sid, courseId: cid, status: "active" });
      }
    }

    const [student] = await db.select({ name: studentsTable.name, email: studentsTable.email, phone: studentsTable.phone }).from(studentsTable).where(eq(studentsTable.id, parseInt(studentId)));

    await db.insert(activityTable).values({
      type: "payment",
      description: `Online payment of $${amount} completed for ${student?.name ?? "student"}`,
      studentName: student?.name ?? null,
      amount: String(amount),
    });

    const [settingsRow] = await db.select().from(settingsTable).limit(1);
    if (settingsRow) {
      firePurchaseConversions(
        settingsRow,
        {
          orderId: String(payment!.id),
          value: Number(amount),
          currency: settingsRow.currency,
          email: student?.email,
          phone: student?.phone,
          clientIp: req.ip,
          userAgent: req.headers["user-agent"],
        },
        req.log
      );
    }

    res.status(201).json({
      ...payment,
      amount: Number(payment!.amount),
      studentName: student?.name ?? null,
      message: "Payment completed successfully. Course access granted.",
    });
  } catch (err) {
    req.log.error({ err }, "Error processing online payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. رفع إيصال الدفع اليدوي
// POST /api/payments/upload-receipt
router.post("/upload-receipt", uploadReceipt.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No receipt image provided" });
    }

    const receiptUrl = `/api/payments/receipts/${req.file.filename}`;
    res.json({ receiptUrl, filename: req.file.filename });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading receipt");
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// 6. عرض إيصال الدفع
// GET /api/payments/receipts/:filename
router.get("/receipts/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(RECEIPTS_DIR, filename!);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    req.log.error({ err }, "Error serving receipt");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. تحديث حالة الدفع (من قبل الأدمن)
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const parsed = CreatePaymentBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { studentId, courseId, amount, status, method, notes, paidAt } = parsed.data;
    const receiptUrl = (req.body as any).receiptUrl ?? null;

    const [payment] = await db
      .update(paymentsTable)
      .set({
        studentId,
        courseId: courseId ?? null,
        amount: String(amount),
        status,
        method,
        receiptUrl,
        notes: notes ?? null,
        paidAt: paidAt ? new Date(paidAt as string) : null,
      })
      .where(eq(paymentsTable.id, id))
      .returning();

    if (!payment) return res.status(404).json({ error: "Payment not found" });

    // لو الأدمن وافق على الطلب
    if (status === "completed" || status === "approved") {
      await db.update(studentsTable)
        .set({ paymentStatus: "paid" })
        .where(eq(studentsTable.id, payment.studentId));

      const [student] = await db.select({ name: studentsTable.name, email: studentsTable.email, phone: studentsTable.phone }).from(studentsTable).where(eq(studentsTable.id, payment.studentId));
      await db.insert(activityTable).values({
        type: "payment",
        description: `Admin confirmed payment of $${amount} for ${student?.name}`,
        studentName: student?.name ?? null,
        amount: String(amount),
      });

      const [settingsRow] = await db.select().from(settingsTable).limit(1);
      if (settingsRow) {
        firePurchaseConversions(
          settingsRow,
          {
            orderId: String(payment.id),
            value: amount,
            currency: settingsRow.currency,
            email: student?.email,
            phone: student?.phone,
            clientIp: req.ip,
            userAgent: req.headers["user-agent"],
          },
          req.log
        );
      }
    }

    res.json({
      ...payment,
      amount: Number(payment.amount)
    });
  } catch (err) {
    req.log.error({ err }, "Error updating payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
