import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { Users, BookOpen, TrendingUp, Clock, Activity, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const fallbackMonthlyData = [
  { month: "Oct", revenue: 820 },
  { month: "Nov", revenue: 1100 },
  { month: "Dec", revenue: 950 },
  { month: "Jan", revenue: 1340 },
  { month: "Feb", revenue: 1480 },
  { month: "Mar", revenue: 1210 },
  { month: "Apr", revenue: 1345 },
];

function fetchWithAuth(url: string) {
  const token = localStorage.getItem("lms_admin_token");
  const tenant = localStorage.getItem("tenant_slug");
  const sep = url.includes("?") ? "&" : "?";
  return fetch(`${url}${tenant ? `${sep}tenant=${tenant}` : ""}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function activityBadge(type: string) {
  const map: Record<string, string> = {
    enrollment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    payment: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    course_created: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    lesson_completed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return map[type] ?? "bg-muted text-muted-foreground";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

export default function Dashboard() {
  const { t } = useI18n();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() },
  });

  // ✅ fetchWithAuth بدل fetch العادي
  const { data: monthlyRevenueData } = useQuery<{ month: string; revenue: number }[]>({
    queryKey: ["dashboard", "monthly-revenue"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/dashboard/monthly-revenue");
      if (!res.ok) throw new Error("Failed to fetch monthly revenue");
      return res.json();
    },
  });

  const monthlyData = monthlyRevenueData ?? fallbackMonthlyData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {loadingSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t("totalStudents")} value={summary?.totalStudents ?? 0} icon={Users} color="bg-primary" sub={`${summary?.activeStudents ?? 0} active`} />
          <StatCard label={t("totalCourses")} value={summary?.totalCourses ?? 0} icon={BookOpen} color="bg-violet-500" />
          <StatCard label={t("revenue")} value={`$${(summary?.totalRevenue ?? 0).toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500" sub={`$${(summary?.thisMonthRevenue ?? 0).toLocaleString()} this month`} />
          <StatCard label={t("pendingRevenue")} value={`$${(summary?.pendingRevenue ?? 0).toLocaleString()}`} icon={Clock} color="bg-amber-500" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("monthly_revenue")}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(243 75% 59%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(243 75% 59%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                formatter={(value) => [`$${value}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(243 75% 59%)" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t("recentActivity")}</h2>
          {loadingActivity ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[280px]">
              {(Array.isArray(activity) ? activity : []).slice(0, 5).map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${activityBadge(item.type)}`}>
                    {item.type === "enrollment" ? "Enrolled" : item.type === "payment" ? "Paid" : item.type === "course_created" ? "Course" : "Lesson"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-tight truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("completionRate")}</span>
          </div>
          <p className="text-2xl font-bold">{summary?.completionRate?.toFixed(1) ?? 0}%</p>
          <div className="mt-3 w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${summary?.completionRate ?? 0}%` }} />
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold">{t("enrollmentsThisMonth")}</span>
          </div>
          <p className="text-2xl font-bold">{summary?.enrollmentsThisMonth ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-2">New students this month</p>
        </div>
      </div>
    </div>
  );
}