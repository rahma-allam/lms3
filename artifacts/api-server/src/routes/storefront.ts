import { Router } from "express";
import { db } from "@workspace/db";
import { coursesTable, settingsTable, categoriesTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

export default router;