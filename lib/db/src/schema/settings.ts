import { pgTable, serial, text, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const defaultLanguageEnum = pgEnum("default_language", ["en", "ar"]);

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .unique()
    .references(() => tenantsTable.id, { onDelete: "cascade" }),
  academyName: text("academy_name").notNull().default("My Academy"),
  academyNameAr: text("academy_name_ar"),
  logoUrl: text("logo_url"),
  metaPixelId: text("meta_pixel_id"),
  metaConversionToken: text("meta_conversion_token"),
  googleTagId: text("google_tag_id"),
  googleApiSecret: text("google_api_secret"),
  tiktokPixelId: text("tiktok_pixel_id"),
  tiktokAccessToken: text("tiktok_access_token"),
  defaultLanguage: defaultLanguageEnum("default_language").notNull().default("en"),
  currency: text("currency").notNull().default("USD"),
  manualPaymentInstructions: text("manual_payment_instructions"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
