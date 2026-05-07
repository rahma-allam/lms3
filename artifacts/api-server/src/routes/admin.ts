// NEW: Admin-only endpoints for payment management
import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, studentsTable, coursesTable, activityTable, enrollmentsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

// GET /api/admin/payments?status=pending
// List payments filtered by status (for admin review)
router.get("/payments", async (req, res) => {
  try {
    const { status } = req.query;

    let payments = await db
      .select({
        payment: paymentsTable,
        studentName: studentsTable.name,
        studentEmail: studentsTable.email,
        studentPhone: studentsTable.phone,
        courseName: coursesTable.title,
      })
      .from(paymentsTable)
      .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
      .leftJoin(coursesTable, eq(paymentsTable.courseId, coursesTable.id))
      .orderBy(sql`${paymentsTable.createdAt} desc`);

    if (status) {
      payments = payments.filter((p) => p.payment.status === status);
    }

    res.json(
      payments.map(({ payment, studentName, studentEmail, studentPhone, courseName }) => ({
        id: payment.id,
        studentId: payment.studentId,
        studentName: studentName ?? null,
        studentEmail: studentEmail ?? null,
        studentPhone: studentPhone ?? null,
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
    req.log.error({ err }, "Error listing admin payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/payments/:id/approve
// Approve a manual payment — enroll student and unlock course access
router.post("/payments/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id));

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "approved" || payment.status === "completed") {
      return res.status(400).json({ error: "Payment already approved" });
    }

    // Mark payment as approved
    const [updated] = await db
      .update(paymentsTable)
      .set({ status: "approved", paidAt: new Date() })
      .where(eq(paymentsTable.id, id))
      .returning();

    // Enroll student and unlock course access
    await db
      .update(studentsTable)
      .set({
        paymentStatus: "paid",
        status: "active",
        ...(payment.courseId ? { courseId: payment.courseId } : {}),
      })
      .where(eq(studentsTable.id, payment.studentId));

    // Insert enrollment record
    if (payment.courseId) {
      const existing = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.studentId, payment.studentId), eq(enrollmentsTable.courseId, payment.courseId)));
      if (existing.length === 0) {
        await db.insert(enrollmentsTable).values({ studentId: payment.studentId, courseId: payment.courseId, status: "active" });
      }
    }

    const [student] = await db
      .select({ name: studentsTable.name })
      .from(studentsTable)
      .where(eq(studentsTable.id, payment.studentId));

    await db.insert(activityTable).values({
      type: "payment",
      description: `Admin approved payment of $${payment.amount} for ${student?.name ?? "student"}`,
      studentName: student?.name ?? null,
      amount: String(payment.amount),
    });

    res.json({
      ...updated,
      amount: Number(updated!.amount),
      message: "Payment approved. Student enrolled and course access granted.",
    });
  } catch (err) {
    req.log.error({ err }, "Error approving payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/payments/:id/reject
// Reject a manual payment
router.post("/payments/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const { reason } = req.body;

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id));

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "approved" || payment.status === "completed") {
      return res.status(400).json({ error: "Cannot reject an already approved payment" });
    }

    // Mark payment as rejected
    const [updated] = await db
      .update(paymentsTable)
      .set({
        status: "rejected",
        notes: reason ? `Rejected: ${reason}` : "Rejected by admin",
      })
      .where(eq(paymentsTable.id, id))
      .returning();

    const [student] = await db
      .select({ name: studentsTable.name })
      .from(studentsTable)
      .where(eq(studentsTable.id, payment.studentId));

    await db.insert(activityTable).values({
      type: "payment",
      description: `Admin rejected payment from ${student?.name ?? "student"}${reason ? `: ${reason}` : ""}`,
      studentName: student?.name ?? null,
      amount: String(payment.amount),
    });

    res.json({
      ...updated,
      amount: Number(updated!.amount),
      message: "Payment rejected.",
    });
  } catch (err) {
    req.log.error({ err }, "Error rejecting payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
