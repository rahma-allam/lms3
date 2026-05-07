import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useListPayments,
  useCreatePayment,
  useGetPaymentSummary,
  useListStudents,
  useListCourses,
  getListPaymentsQueryKey,
  getGetPaymentSummaryQueryKey,
  getListStudentsQueryKey,
  getListCoursesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp, Clock, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { usePixelTracking } from "@/hooks/use-pixel-tracking";
import { cn } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-muted text-muted-foreground",
};

export default function Payments() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { trackPurchase } = usePixelTracking();

  const { data: payments, isLoading } = useListPayments({}, {
    query: { queryKey: getListPaymentsQueryKey() },
  });

  const { data: summary } = useGetPaymentSummary({
    query: { queryKey: getGetPaymentSummaryQueryKey() },
  });

  const { data: students } = useListStudents({}, { query: { queryKey: getListStudentsQueryKey() } });
  const { data: courses } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey() } });

  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: (payment) => {
        qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPaymentSummaryQueryKey() });
        setDialogOpen(false);
        reset();
        toast.success("Payment recorded");
        if (payment.status === "completed") {
          trackPurchase(payment.amount);
        }
      },
      onError: () => toast.error("Failed to record payment"),
    },
  });

  const { register, handleSubmit, reset } = useForm<{
    studentId: string;
    courseId: string;
    amount: number;
    status: "completed" | "pending" | "failed" | "refunded";
    method: "bank_transfer" | "cash" | "card" | "online";
    notes: string;
  }>({ defaultValues: { status: "pending", method: "cash" } });

  const filtered = (payments ?? []).filter(
    (p) => statusFilter === "all" || p.status === statusFilter
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("payments")}</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {t("addPayment")}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("revenue"), value: `$${(summary?.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "bg-emerald-500" },
          { label: t("pendingRevenue"), value: `$${(summary?.pendingRevenue ?? 0).toLocaleString()}`, icon: Clock, color: "bg-amber-500" },
          { label: t("thisMonth"), value: `$${(summary?.thisMonthRevenue ?? 0).toLocaleString()}`, icon: CreditCard, color: "bg-primary" },
          { label: t("total_transactions"), value: summary?.totalTransactions ?? 0, icon: CheckCircle, color: "bg-violet-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "completed", "pending", "failed", "refunded"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            )}
          >
            {t(s)}
          </button>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noData")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("students")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("course")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("amount")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("method")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.studentName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-40 truncate">{p.courseName ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">${Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{t(p.method)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusBadge[p.status])}>
                        {t(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("addPayment")}</DialogTitle></DialogHeader>
          <form
            onSubmit={handleSubmit((data) =>
              createPayment.mutate({
                data: {
                  studentId: parseInt(data.studentId),
                  courseId: data.courseId ? parseInt(data.courseId) : undefined,
                  amount: Number(data.amount),
                  status: data.status,
                  method: data.method,
                  notes: data.notes || undefined,
                },
              })
            )}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">{t("students")} *</label>
              <select {...register("studentId", { required: true })} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm">
                <option value="">Select student...</option>
                {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("course")}</label>
              <select {...register("courseId")} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm">
                <option value="">Select course...</option>
                {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("amount")} ($) *</label>
                <Input {...register("amount", { required: true })} type="number" min="0" step="0.01" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">{t("method")}</label>
                <select {...register("method")} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm">
                  <option value="cash">{t("cash")}</option>
                  <option value="bank_transfer">{t("bank_transfer")}</option>
                  <option value="card">{t("card")}</option>
                  <option value="online">{t("online")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("status")}</label>
              <select {...register("status")} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm">
                <option value="pending">{t("pending")}</option>
                <option value="completed">{t("completed")}</option>
                <option value="failed">{t("failed")}</option>
                <option value="refunded">{t("refunded")}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("notes")}</label>
              <Input {...register("notes")} className="mt-1" />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={createPayment.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
