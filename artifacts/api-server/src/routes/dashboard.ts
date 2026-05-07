import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, paymentsTable, coursesTable, activityTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [studentStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${studentsTable.status} = 'active')::int`,
      })
      .from(studentsTable);

    const [courseStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(coursesTable);

    const [revenueStats] = await db
      .select({
        total: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where ${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved'), 0)`,
        pending: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where ${paymentsTable.status} = 'pending'), 0)`,
        thisMonth: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where (${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved') and ${paymentsTable.createdAt} >= ${startOfMonth}), 0)`,
      })
      .from(paymentsTable);

    const [enrollmentStats] = await db
      .select({
        thisMonth: sql<number>`count(*) filter (where ${studentsTable.enrolledAt} >= ${startOfMonth})::int`,
      })
      .from(studentsTable);

    const [progressStats] = await db
      .select({
        avg: sql<number>`coalesce(avg(${studentsTable.progress}::numeric), 0)`,
      })
      .from(studentsTable);

    res.json({
      totalStudents: studentStats?.total ?? 0,
      activeStudents: studentStats?.active ?? 0,
      totalCourses: courseStats?.total ?? 0,
      totalRevenue: Number(revenueStats?.total ?? 0),
      pendingRevenue: Number(revenueStats?.pending ?? 0),
      thisMonthRevenue: Number(revenueStats?.thisMonth ?? 0),
      enrollmentsThisMonth: enrollmentStats?.thisMonth ?? 0,
      completionRate: Number(progressStats?.avg ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-activity", async (req, res) => {
  try {
    const activities = await db
      .select()
      .from(activityTable)
      .orderBy(sql`${activityTable.createdAt} desc`)
      .limit(20);

    res.json(
      activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        studentName: a.studentName ?? null,
        courseName: a.courseName ?? null,
        amount: a.amount ? Number(a.amount) : null,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching recent activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Feature 2: Monthly Revenue Chart — Real Data
// GET /api/dashboard/monthly-revenue
router.get("/monthly-revenue", async (req, res) => {
  try {
    const now = new Date();
    const months: { month: string; revenue: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthLabel = d.toLocaleString("en-US", { month: "short" });

      const [row] = await db
        .select({
          revenue: sql<number>`coalesce(sum(${paymentsTable.amount}::numeric) filter (where (${paymentsTable.status} = 'completed' or ${paymentsTable.status} = 'approved') and ${paymentsTable.createdAt} >= ${start} and ${paymentsTable.createdAt} < ${end}), 0)`,
        })
        .from(paymentsTable);

      months.push({ month: monthLabel, revenue: Number(row?.revenue ?? 0) });
    }

    res.json(months);
  } catch (err) {
    req.log.error({ err }, "Error fetching monthly revenue");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
