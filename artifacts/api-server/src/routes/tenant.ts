import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Extend Express Request to carry tenant info
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenant?: typeof tenantsTable.$inferSelect;
    }
  }
}

// Simple in-memory cache – avoids a DB hit on every request
const tenantCache = new Map<string, { tenant: typeof tenantsTable.$inferSelect; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string) ||
    "";
  const hostname = host.split(":")[0] ?? "";
  const BASE_DOMAIN = process.env.BASE_DOMAIN || "";

  // Dev: allow ?tenant= query param or x-tenant-slug header
  const isNonProd = process.env.NODE_ENV !== "production";
  const manualSlug = isNonProd
    ? (req.query.tenant as string) || (req.headers["x-tenant-slug"] as string)
    : undefined;

  let lookupKey: string | undefined;
  let lookupType: "slug" | "customDomain" | undefined;

  if (manualSlug) {
    lookupKey = manualSlug;
    lookupType = "slug";
  } else if (BASE_DOMAIN && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    lookupKey = hostname.replace(`.${BASE_DOMAIN}`, "");
    lookupType = "slug";
  } else if (
    hostname !== BASE_DOMAIN &&
    hostname !== `www.${BASE_DOMAIN}` &&
    hostname !== "localhost" &&
    !hostname.startsWith("127.") &&
    hostname !== "" &&
    hostname !== "0.0.0.0"
  ) {
    lookupKey = hostname;
    lookupType = "customDomain";
  }

  if (!lookupKey) {
    return next();
  }

  // Check cache first
  const cacheKey = `${lookupType}:${lookupKey}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    req.tenantId = cached.tenant.id;
    req.tenant = cached.tenant;
    return next();
  }

  try {
    const condition =
      lookupType === "slug"
        ? eq(tenantsTable.slug, lookupKey)
        : eq(tenantsTable.customDomain, lookupKey);

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(condition)
      .limit(1);

    if (!tenant) {
      return res.status(404).json({ error: "Academy not found" });
    }

    if (tenant.status === "suspended") {
      return res.status(403).json({
        error: "Academy suspended",
        message: "This academy has been suspended. Please contact support.",
      });
    }

    const isExpired =
      tenant.planExpiresAt && tenant.planExpiresAt < new Date();
    if (isExpired) {
      return res.status(402).json({
        error: "Subscription expired",
        message: "Please renew your subscription to continue.",
      });
    }

    if (tenantCache.size >= MAX_CACHE_SIZE) {
      const firstKey = tenantCache.keys().next().value;
      if (firstKey) tenantCache.delete(firstKey);
    }
    tenantCache.set(cacheKey, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });

    req.tenantId = tenant.id;
    req.tenant = tenant;

    return next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Call this after updating a tenant's status/domain to keep the cache fresh */
export function invalidateTenantCache(tenantId: number) {
  for (const [key, value] of tenantCache.entries()) {
    if (value.tenant.id === tenantId) {
      tenantCache.delete(key);
    }
  }
}

