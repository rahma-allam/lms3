import { Router } from "express";
import { db } from "@workspace/db";
import { couponsTable, tenantsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

async function getDefaultTenantId(): Promise<number> {
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, "default")).limit(1);
  if (!tenant) throw new Error("Default tenant not found.");
  return tenant.id;
}

router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const coupons = await db.select().from(couponsTable)
      .where(eq(couponsTable.tenantId, tenantId))
      .orderBy(sql`${couponsTable.createdAt} desc`);
    res.json(coupons.map((c) => ({ ...c, discountValue: Number(c.discountValue) })));
  } catch (err) {
    req.log.error({ err }, "Error listing coupons");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { code, courseId, amount } = req.body;
    if (!code) return res.status(400).json({ error: "code required" });

    const [coupon] = await db.select().from(couponsTable)
      .where(and(eq(couponsTable.code, code.toUpperCase()), eq(couponsTable.tenantId, tenantId)));
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
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code required" });
    await db.update(couponsTable)
      .set({ usedCount: sql`${couponsTable.usedCount} + 1` })
      .where(and(eq(couponsTable.code, code.toUpperCase()), eq(couponsTable.tenantId, tenantId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error applying coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { code, discountType, discountValue, maxUses, courseId, expiresAt, isActive } = req.body;
    if (!code || !discountType || discountValue === undefined) return res.status(400).json({ error: "code, discountType, discountValue required" });
    const [coupon] = await db.insert(couponsTable).values({
      tenantId,
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
    if (err?.code === "23505") return res.status(409).json({ error: "Coupon code already exists for this academy" });
    req.log.error({ err }, "Error creating coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
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
    }).where(and(eq(couponsTable.id, id), eq(couponsTable.tenantId, tenantId))).returning();
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json({ ...coupon, discountValue: Number(coupon.discountValue) });
  } catch (err) {
    req.log.error({ err }, "Error updating coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const id = parseInt(req.params.id!);
    const [existing] = await db.select().from(couponsTable)
      .where(and(eq(couponsTable.id, id), eq(couponsTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "Coupon not found" });
    await db.delete(couponsTable).where(and(eq(couponsTable.id, id), eq(couponsTable.tenantId, tenantId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting coupon");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;