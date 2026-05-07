import { Router } from "express";
import { db } from "@workspace/db";
import { couponsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(sql`${couponsTable.createdAt} desc`);
    res.json(coupons.map((c) => ({ ...c, discountValue: Number(c.discountValue) })));
  } catch (err) {
    req.log.error({ err }, "Error listing coupons");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const { code, courseId, amount } = req.body;
    if (!code) return res.status(400).json({ error: "code required" });

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
    if (!coupon) return res.json({ valid: false, reason: "Coupon not found" });
    if (!coupon.isActive) return res.json({ valid: false, reason: "Coupon is inactive" });
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.json({ valid: false, reason: "Coupon has expired" });
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return res.json({ valid: false, reason: "Coupon usage limit reached" });
    if (coupon.courseId && courseId && coupon.courseId !== parseInt(courseId)) return res.json({ valid: false, reason: "Coupon not valid for this course" });

    const val = Number(coupon.discountValue);
    const finalAmount = coupon.discountType === "percentage"
      ? Math.max(0, amount - (amount * val / 100))
      : Math.max(0, amount - val);

    res.json({ valid: true, discountType: coupon.discountType, discountValue: val, finalAmount: Math.round(finalAmount * 100) / 100 });
  } catch (err) {
    req.log.error({ err }, "Error validating coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/apply", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code required" });
    await db.update(couponsTable).set({ usedCount: sql`${couponsTable.usedCount} + 1` }).where(eq(couponsTable.code, code.toUpperCase()));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error applying coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { code, discountType, discountValue, maxUses, courseId, expiresAt, isActive } = req.body;
    if (!code || !discountType || discountValue === undefined) return res.status(400).json({ error: "code, discountType, discountValue required" });
    const [coupon] = await db.insert(couponsTable).values({
      code: code.toUpperCase(),
      discountType,
      discountValue: String(discountValue),
      maxUses: maxUses ?? null,
      courseId: courseId ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    }).returning();
    res.status(201).json({ ...coupon, discountValue: Number(coupon!.discountValue) });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Coupon code already exists" });
    req.log.error({ err }, "Error creating coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const { code, discountType, discountValue, maxUses, courseId, expiresAt, isActive } = req.body;
    const [coupon] = await db.update(couponsTable).set({
      code: code?.toUpperCase(),
      discountType,
      discountValue: discountValue !== undefined ? String(discountValue) : undefined,
      maxUses: maxUses ?? null,
      courseId: courseId ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive,
    }).where(eq(couponsTable.id, id)).returning();
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json({ ...coupon, discountValue: Number(coupon.discountValue) });
  } catch (err) {
    req.log.error({ err }, "Error updating coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
