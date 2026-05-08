import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const academyProfileTable = pgTable("academy_profile", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").unique().references(() => tenantsTable.id, { onDelete: "cascade" }),
  aboutEn: text("about_en"),
  aboutAr: text("about_ar"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  twitterUrl: text("twitter_url"),
  address: text("address"),
  addressAr: text("address_ar"),
  heroTitleEn: text("hero_title_en"),
  heroTitleAr: text("hero_title_ar"),
  heroSubtitleEn: text("hero_subtitle_en"),
  heroSubtitleAr: text("hero_subtitle_ar"),
  heroCtaEn: text("hero_cta_en"),
  heroCtaAr: text("hero_cta_ar"),
});

export type AcademyProfile = typeof academyProfileTable.$inferSelect;