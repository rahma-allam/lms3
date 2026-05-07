-- ================================================================
-- Migration: Add Multi-tenant Support
-- Run this ONCE on your existing database
-- ================================================================

-- 1. Create tenant_status enum
DO $$ BEGIN
  CREATE TYPE "tenant_status" AS ENUM ('active', 'suspended', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" serial PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "custom_domain" text UNIQUE,
  "name" text NOT NULL,
  "status" "tenant_status" NOT NULL DEFAULT 'trial',
  "plan_expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- 3. Insert a default tenant for your existing data
-- Change 'default' and 'My Academy' to your actual values
INSERT INTO "tenants" ("slug", "name", "status")
VALUES ('default', 'My Academy', 'active')
ON CONFLICT ("slug") DO NOTHING;

-- 4. Add tenant_id to settings table
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "tenant_id" integer;

-- Assign existing settings rows to the default tenant
UPDATE "settings"
SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'default')
WHERE "tenant_id" IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "settings"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "settings"
  ADD CONSTRAINT "settings_tenant_id_unique" UNIQUE ("tenant_id");

ALTER TABLE "settings"
  ADD CONSTRAINT "settings_tenant_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

-- 5. Add tenant_id to courses table
ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "tenant_id" integer;

UPDATE "courses"
SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'default')
WHERE "tenant_id" IS NULL;

ALTER TABLE "courses"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_tenant_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "courses_tenant_id_idx" ON "courses"("tenant_id");

-- 6. Add tenant_id to students table
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "tenant_id" integer;

UPDATE "students"
SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'default')
WHERE "tenant_id" IS NULL;

ALTER TABLE "students"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "students"
  ADD CONSTRAINT "students_tenant_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "students_tenant_id_idx" ON "students"("tenant_id");

-- 7. Add tenant_id to categories table
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "tenant_id" integer;

UPDATE "categories"
SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'default')
WHERE "tenant_id" IS NULL;

ALTER TABLE "categories"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_tenant_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;

-- ================================================================
-- Done! Your database now supports Multi-tenant.
-- ================================================================
