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
import academyProfileRouter from "./academy-profile";
import certificatesRouter from "./certificates";
import couponsRouter from "./coupons";
import adminAuthRouter from "./admin-auth";
import instructorAuthRouter from "./instructor-auth";
import tenantRouter from "./tenant";
import { requireAdmin, requireInstructor } from "../middlewares/auth.js";

const router: IRouter = Router();

// ========== Public Storefront Routes (no auth) ==========
import storefrontRouter from "./storefront";
router.use("/storefront", storefrontRouter);

// Public routes (no auth needed)
router.use(healthRouter);
router.use("/instructor-auth", instructorAuthRouter);
router.use("/auth", authRouter);
router.use("/admin-auth", adminAuthRouter);

// Public tenant theme endpoint (called by React frontend on load)
router.use("/tenant", tenantRouter);


// Instructor routes
router.use("/instructors", requireInstructor, instructorsRouter);

// Admin-protected routes
router.use("/admin", requireAdmin, adminRouter);
router.use("/dashboard", requireAdmin, dashboardRouter);
router.use("/courses", requireAdmin, coursesRouter);
router.use("/modules", requireAdmin, lessonsRouter);
router.use("/lessons", requireAdmin, lessonsRouter);
router.use("/students", requireAdmin, studentsRouter);
router.use("/payments", requireAdmin, paymentsRouter);
router.use("/settings", requireAdmin, settingsRouter);
router.use("/quizzes", requireAdmin, quizzesRouter);
router.use("/enrollments", requireAdmin, enrollmentsRouter);
router.use("/categories", requireAdmin, categoriesRouter);

router.use("/certificates", requireAdmin, certificatesRouter);
router.use("/coupons", requireAdmin, couponsRouter);

export default router;
