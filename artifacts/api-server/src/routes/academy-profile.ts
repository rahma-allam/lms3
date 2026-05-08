import { Router } from "express";
import { db } from "@workspace/db";
import { academyProfileTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

async function ensureProfile(tenantId: number) {
  const existing = await db
    .select()
    .from(academyProfileTable)
    .where(eq(academyProfileTable.tenantId, tenantId))
    .limit(1);
  if (existing.length === 0) {
    const [row] = await db.insert(academyProfileTable).values({ tenantId }).returning();
    return row!;
  }
  return existing[0]!;
}

router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const profile = await ensureProfile(tenantId);
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Error fetching academy profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const profile = await ensureProfile(tenantId);
    const fields = [
      "aboutEn", "aboutAr", "phone", "whatsapp", "email",
      "facebookUrl", "instagramUrl", "youtubeUrl", "twitterUrl",
      "address", "addressAr",
      "heroTitleEn", "heroTitleAr", "heroSubtitleEn", "heroSubtitleAr", "heroCtaEn", "heroCtaAr",
    ] as const;
    const update: Record<string, string | null> = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) update[f] = req.body[f] || null;
    }
    const [updated] = await db
      .update(academyProfileTable)
      .set(update)
      .where(eq(academyProfileTable.id, profile.id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating academy profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
