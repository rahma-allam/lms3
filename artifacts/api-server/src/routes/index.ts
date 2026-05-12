import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import coursesRouter from "./courses";
import lessonsRouter from "./lessons";
import studentsRouter from "./students";
import paymentsRouter from "./payments";
import settingsRouter from "./settings";
import instructorsRouter from "./instructors";
import authRouter from "./auth";
import adminRouter from "./admin";
import quizzesRouter from "./quizzes";
import enrollmentsRouter from "./enrollments";
import categoriesRouter from "./categories";
import certificatesRouter from "./certificates";
import couponsRouter from "./coupons";
import adminAuthRouter from "./admin-auth";
import instructorAuthRouter from "./instructor-auth";
import { requireAdmin, requireInstructor } from "../middlewares/auth.js";
import { db, settingsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ========== Public Storefront Routes (no auth) ==========
import storefrontRouter from "./storefront";
router.use("/storefront", storefrontRouter);

// ========== Public Tenant Theme Route ==========


router.get("/tenant/theme", async (req, res) => {
  try {
    const slug = req.query.slug as string;
    if (!slug) return res.status(400).json({ error: "slug is required" });

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    if (!tenant) return res.status(404).json({ error: "Academy not found" });

    const [settings] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.tenantId, tenant.id))
      .limit(1);

    res.json({
      tenantId: tenant.id,
      theme: {
        academyName: settings?.academyName ?? tenant.name,
        academyNameAr: settings?.academyNameAr ?? null,
        logoUrl: settings?.logoUrl ?? null,
        defaultLanguage: settings?.defaultLanguage ?? "ar",
        currency: settings?.currency ?? "USD",
        metaPixelId: settings?.metaPixelId ?? null,
        googleTagId: settings?.googleTagId ?? null,
        tiktokPixelId: settings?.tiktokPixelId ?? null,
        manualPaymentInstructions: settings?.manualPaymentInstructions ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== Public Routes (no auth) ==========
router.use(healthRouter);
router.use("/instructor-auth", instructorAuthRouter);
router.use("/auth", authRouter);
router.use("/admin-auth", adminAuthRouter);

// ========== Instructor Routes ==========
router.use("/instructors", requireInstructor, instructorsRouter);

// ========== Admin-Protected Routes ==========
router.use("/admin", requireAdmin, adminRouter);
router.use("/dashboard", requireAdmin, dashboardRouter);
router.use("/courses", requireAdmin, coursesRouter);
router.use("/modules", requireAdmin, lessonsRouter);
router.use("/lessons", requireAdmin, lessonsRouter);
router.use("/students", requireAdmin, studentsRouter);
// upload-receipt: public — الطالب بيرفع إيصاله بدون admin token
router.post("/payments/upload-receipt", paymentsRouter);
// باقي الـ payments محمية بـ requireAdmin
router.use("/payments", requireAdmin, paymentsRouter);
router.use("/settings", requireAdmin, settingsRouter);
router.use("/quizzes", requireAdmin, quizzesRouter);
router.use("/enrollments", requireAdmin, enrollmentsRouter);
router.use("/categories", requireAdmin, categoriesRouter);
router.use("/certificates", requireAdmin, certificatesRouter);
router.use("/coupons", requireAdmin, couponsRouter)

export default router;