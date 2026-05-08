import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getDefaultTenantId(): Promise<number> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "default"))
    .limit(1);
  if (!tenant) throw new Error("Default tenant not found.");
  return tenant.id;
}

router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const cats = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.tenantId, tenantId))
      .orderBy(categoriesTable.order);
    res.json(cats);
  } catch (err) {
    req.log.error({ err }, "Error listing categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { name, nameAr, slug, color, order } = req.body;
    if (!name || !slug) return res.status(400).json({ error: "name and slug required" });
    const [cat] = await db
      .insert(categoriesTable)
      .values({ tenantId, name, nameAr: nameAr ?? null, slug, color: color ?? "#6366f1", order: order ?? 0 })
      .returning();
    res.status(201).json(cat);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Category slug already exists" });
    }
    req.log.error({ err }, "Error creating category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const { name, nameAr, slug, color, order } = req.body;
    const [cat] = await db
      .update(categoriesTable)
      .set({ name, nameAr: nameAr ?? null, slug, color, order })
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.tenantId, tenantId)))
      .returning();
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    req.log.error({ err }, "Error updating category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "Category not found" });
    await db.delete(categoriesTable).where(and(eq(categoriesTable.id, id), eq(categoriesTable.tenantId, tenantId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting category");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;