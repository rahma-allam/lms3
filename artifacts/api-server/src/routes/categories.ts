import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.order);
    res.json(cats);
  } catch (err) {
    req.log.error({ err }, "Error listing categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, nameAr, slug, color, order } = req.body;
    if (!name || !slug) return res.status(400).json({ error: "name and slug required" });
    const [cat] = await db.insert(categoriesTable).values({ name, nameAr: nameAr ?? null, slug, color: color ?? "#6366f1", order: order ?? 0 }).returning();
    res.status(201).json(cat);
  } catch (err) {
    req.log.error({ err }, "Error creating category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!);
    const { name, nameAr, slug, color, order } = req.body;
    const [cat] = await db.update(categoriesTable).set({ name, nameAr: nameAr ?? null, slug, color, order }).where(eq(categoriesTable.id, id)).returning();
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
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting category");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
