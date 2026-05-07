import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

async function getDefaultTenantId(): Promise<number> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "default"))
    .limit(1);
  if (!tenant) throw new Error("Default tenant not found. Run the migration first.");
  return tenant.id;
}

async function ensureSettings(tenantId: number) {
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.tenantId, tenantId))
    .limit(1);
  if (existing.length === 0) {
    const [row] = await db
      .insert(settingsTable)
      .values({ tenantId })
      .returning();
    return row!;
  }
  return existing[0]!;
}

function settingsToJson(s: typeof settingsTable.$inferSelect) {
  return {
    id: s.id,
    academyName: s.academyName,
    academyNameAr: s.academyNameAr ?? null,
    logoUrl: s.logoUrl ?? null,
    metaPixelId: s.metaPixelId ?? null,
    metaConversionToken: s.metaConversionToken ?? null,
    googleTagId: s.googleTagId ?? null,
    googleApiSecret: s.googleApiSecret ?? null,
    tiktokPixelId: s.tiktokPixelId ?? null,
    tiktokAccessToken: s.tiktokAccessToken ?? null,
    defaultLanguage: s.defaultLanguage,
    currency: s.currency,
    manualPaymentInstructions: s.manualPaymentInstructions ?? null,
  };
}

router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const settings = await ensureSettings(tenantId);
    res.json(settingsToJson(settings));
  } catch (err) {
    req.log.error({ err }, "Error fetching settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const tenantId = req.tenantId ?? (await getDefaultTenantId());
    const existing = await ensureSettings(tenantId);

    const {
      academyName, academyNameAr, logoUrl, metaPixelId,
      metaConversionToken, googleTagId, googleApiSecret,
      tiktokPixelId, tiktokAccessToken, defaultLanguage, currency,
    } = parsed.data;
    const manualPaymentInstructions =
      (req.body as Record<string, unknown>).manualPaymentInstructions as string ?? null;

    const [settings] = await db
      .update(settingsTable)
      .set({
        academyName, academyNameAr: academyNameAr ?? null,
        logoUrl: logoUrl ?? null, metaPixelId: metaPixelId ?? null,
        metaConversionToken: metaConversionToken ?? null,
        googleTagId: googleTagId ?? null, googleApiSecret: googleApiSecret ?? null,
        tiktokPixelId: tiktokPixelId ?? null, tiktokAccessToken: tiktokAccessToken ?? null,
        defaultLanguage, currency, manualPaymentInstructions,
      })
      .where(eq(settingsTable.id, existing.id))
      .returning();

    res.json(settingsToJson(settings!));
  } catch (err) {
    req.log.error({ err }, "Error updating settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;