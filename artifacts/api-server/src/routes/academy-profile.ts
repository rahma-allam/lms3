import { Router } from "express";
import { db } from "@workspace/db";
import { academyProfileTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function ensureProfile() {
  const existing = await db.select().from(academyProfileTable).limit(1);
  if (existing.length === 0) {
    const [row] = await db.insert(academyProfileTable).values({}).returning();
    return row!;
  }
  return existing[0]!;
}

router.get("/", async (req, res) => {
  console.log("--- Profile Request Start ---");
  console.log("Tenant ID from req:", req.tenantId);
  try {
    const profile = await ensureProfile();
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Error fetching academy profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const profile = await ensureProfile();
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
    const [updated] = await db.update(academyProfileTable).set(update).where(eq(academyProfileTable.id, profile.id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating academy profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
