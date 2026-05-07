import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { invalidateTenantCache } from "../middlewares/tenant.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

/**
 * GET /api/tenant/theme
 * Public – called by the React frontend to get academy branding.
 * Resolves tenant from the Host header (handled by tenantMiddleware upstream),
 * but also accepts ?slug= for local development.
 */
router.get("/theme", async (req, res) => {
  try {
    let tenantId = req.tenantId;

    // Dev fallback: allow ?slug=ahmed for localhost testing
    if (!tenantId && req.query.slug) {
      const [t] = await db
        .select()
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, req.query.slug as string))
        .limit(1);
      if (t) tenantId = t.id;
    }

    if (!tenantId) {
      return res.status(404).json({ error: "Tenant not resolved" });
    }

    const [settings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.tenantId, tenantId))
      .limit(1);

    const tenant = req.tenant ?? (await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1))[0];

    return res.json({
      tenantId,
      theme: {
        academyName: settings?.academyName ?? tenant?.name ?? "Academy",
        academyNameAr: settings?.academyNameAr ?? null,
        logoUrl: settings?.logoUrl ?? null,
        defaultLanguage: settings?.defaultLanguage ?? "en",
        currency: settings?.currency ?? "USD",
        metaPixelId: settings?.metaPixelId ?? null,
        googleTagId: settings?.googleTagId ?? null,
        tiktokPixelId: settings?.tiktokPixelId ?? null,
        manualPaymentInstructions: settings?.manualPaymentInstructions ?? null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tenant/list  (Admin only)
 * Returns all tenants – used by Super Admin dashboard.
 */
router.get("/list", requireAdmin, async (_req, res) => {
  try {
    const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);
    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/tenant  (Admin only)
 * Create a new tenant/academy.
 */
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { slug, name, customDomain } = req.body;
    if (!slug || !name) {
      return res.status(400).json({ error: "slug and name are required" });
    }
    const [tenant] = await db
      .insert(tenantsTable)
      .values({ slug, name, customDomain: customDomain ?? null })
      .returning();
    res.status(201).json(tenant);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Slug or custom domain already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/tenant/:id/status  (Admin only)
 * Activate, suspend, or update subscription expiry.
 */
router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, planExpiresAt } = req.body;

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (planExpiresAt) updates.planExpiresAt = new Date(planExpiresAt);

    const [updated] = await db
      .update(tenantsTable)
      .set(updates)
      .where(eq(tenantsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Tenant not found" });

    // Flush cache so next request picks up new status immediately
    invalidateTenantCache(id);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
