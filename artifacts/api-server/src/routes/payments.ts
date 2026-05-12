import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, studentsTable, coursesTable, activityTable, settingsTable, enrollmentsTable, tenantsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreatePaymentBody } from "@workspace/api-zod";
import multer from "multer";
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from "../lib/cloudinary.js";
import { firePurchaseConversions } from "../lib/conversionApi.js";

const router = Router();

// ─── multer: memory storage ثم رفع على Cloudinary ────────────────────────
const uploadReceipt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Image files only"));
  },
});

async function getDefaultTenantId(): Promise<number> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "default"))
    .limit(1);
  if (!tenant) throw new Error("Default tenant not found.");
  return tenant.id;
}

// 1. ملخص المدفوعات (Summary)
router.get("/summary", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
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
      .from(paymentsTable)
      .innerJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .where(eq(studentsTable.tenantId, tenantId));

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
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { status, studentId } = req.query;

    let payments = await db
      .select({
        payment: paymentsTable,
        studentName: studentsTable.name,
        courseName: coursesTable.title,
      })
      .from(paymentsTable)
      .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .leftJoin(coursesTable, eq(paymentsTable.courseId, coursesTable.id))
      .where(eq(studentsTable.tenantId, tenantId))
      .orderBy(sql`${paymentsTable.createdAt} desc`);

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

// 3. إنشاء عملية دفع جديدة
router.post("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const parsed = CreatePaymentBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { studentId, courseId, amount, status, method, notes, paidAt } = parsed.data;
    const receiptUrl = (req.body as any).receiptUrl ?? null;

    // Verify student belongs to this tenant
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.tenantId, tenantId)));
    if (!student) return res.status(404).json({ error: "Student not found" });

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

    if (status === "completed" || status === "approved") {
      await db.update(studentsTable).set({ paymentStatus: "paid" }).where(eq(studentsTable.id, studentId));

      await db.insert(activityTable).values({
        tenantId,
        type: "payment",
        description: `Payment of $${amount} received from ${student.name}`,
        studentName: student.name,
        amount: String(amount),
      });

      const [settingsRow] = await db.select().from(settingsTable).where(eq(settingsTable.tenantId, tenantId)).limit(1);
      if (settingsRow) {
        firePurchaseConversions(
          settingsRow,
          {
            orderId: String(payment!.id),
            value: amount,
            currency: settingsRow.currency,
            email: student.email,
            phone: student.phone,
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
      studentName: student.name,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. دفع أونلاين
router.post("/online", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { studentId, courseId, amount } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({ error: "studentId and amount are required" });
    }

    const sid = parseInt(studentId);
    const cid = courseId ? parseInt(courseId) : null;

    // Verify student belongs to this tenant
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, sid), eq(studentsTable.tenantId, tenantId)));
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        studentId: sid,
        courseId: cid,
        amount: String(amount),
        status: "completed",
        method: "online",
        paidAt: new Date(),
      })
      .returning();

    await db.update(studentsTable)
      .set({ paymentStatus: "paid", status: "active", ...(cid ? { courseId: cid } : {}) })
      .where(eq(studentsTable.id, sid));

    if (cid) {
      const existing = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.studentId, sid), eq(enrollmentsTable.courseId, cid)));
      if (existing.length === 0) {
        await db.insert(enrollmentsTable).values({ studentId: sid, courseId: cid, status: "active" });
      }
    }

    await db.insert(activityTable).values({
      tenantId,
      type: "payment",
      description: `Online payment of $${amount} completed for ${student.name}`,
      studentName: student.name,
      amount: String(amount),
    });

    const [settingsRow] = await db.select().from(settingsTable).where(eq(settingsTable.tenantId, tenantId)).limit(1);
    if (settingsRow) {
      firePurchaseConversions(
        settingsRow,
        {
          orderId: String(payment!.id),
          value: Number(amount),
          currency: settingsRow.currency,
          email: student.email,
          phone: student.phone,
          clientIp: req.ip,
          userAgent: req.headers["user-agent"],
        },
        req.log
      );
    }

    res.status(201).json({
      ...payment,
      amount: Number(payment!.amount),
      studentName: student.name,
      message: "Payment completed successfully. Course access granted.",
    });
  } catch (err) {
    req.log.error({ err }, "Error processing online payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. رفع إيصال الدفع
router.post("/upload-receipt", uploadReceipt.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No receipt image provided" });
    }

    // ارفع الصورة على Cloudinary مباشرةً
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "lms/receipts",
      resource_type: "image",
    });

    res.json({ receiptUrl: result.secure_url, publicId: result.public_id });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading receipt");
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// 6. عرض إيصال الدفع — الإيصالات دلوقتي على Cloudinary مباشرةً
// هذا الـ endpoint للـ backward compatibility مع الإيصالات القديمة المحفوظة محلياً
router.get("/receipts/:filename", async (req, res) => {
  res.status(410).json({ 
    error: "الإيصالات القديمة انتقلت إلى Cloudinary. الإيصالات الجديدة عندها URL مباشر." 
  });
});

// 7. تحديث حالة الدفع (من قبل الأدمن)
router.put("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const id = parseInt(req.params.id!);
    const parsed = CreatePaymentBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { studentId, courseId, amount, status, method, notes, paidAt } = parsed.data;
    const receiptUrl = (req.body as any).receiptUrl ?? null;

    // Verify student belongs to this tenant
    const [student] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.tenantId, tenantId)));
    if (!student) return res.status(404).json({ error: "Student not found" });

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

    if (status === "completed" || status === "approved") {
      await db.update(studentsTable)
        .set({ paymentStatus: "paid" })
        .where(eq(studentsTable.id, payment.studentId));

      await db.insert(activityTable).values({
        tenantId,
        type: "payment",
        description: `Admin confirmed payment of $${amount} for ${student.name}`,
        studentName: student.name,
        amount: String(amount),
      });

      const [settingsRow] = await db.select().from(settingsTable).where(eq(settingsTable.tenantId, tenantId)).limit(1);
      if (settingsRow) {
        firePurchaseConversions(
          settingsRow,
          {
            orderId: String(payment.id),
            value: amount,
            currency: settingsRow.currency,
            email: student.email,
            phone: student.phone,
            clientIp: req.ip,
            userAgent: req.headers["user-agent"],
          },
          req.log
        );
      }
    }

    res.json({ ...payment, amount: Number(payment.amount) });
  } catch (err) {
    req.log.error({ err }, "Error updating payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;