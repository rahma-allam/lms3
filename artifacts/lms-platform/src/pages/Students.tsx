import { useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import {
  useListStudents,
  useCreateStudent,
  useDeleteStudent,
  useListCourses,
  getListStudentsQueryKey,
  getListCoursesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Search, Trash2, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const paymentBadge: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusBadge: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function Students() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: students, isLoading } = useListStudents({}, {
    query: { queryKey: getListStudentsQueryKey() },
  });

  const { data: courses } = useListCourses({}, { query: { queryKey: getListCoursesQueryKey() } });

  const createStudent = useCreateStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setDialogOpen(false);
        reset();
        toast.success("Student enrolled");
      },
      onError: () => toast.error("Failed to enroll student"),
    },
  });

  const deleteStudent = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        toast.success("Student removed");
      },
    },
  });

  const { register, handleSubmit, reset } = useForm<{
    name: string;
    email: string;
    phone: string;
    courseId: string;
    status: "active" | "inactive" | "pending";
    paymentStatus: "paid" | "pending" | "overdue";
  }>({ defaultValues: { status: "active", paymentStatus: "pending" } });

  const filtered = (students ?? []).filter((s) => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchPayment = paymentFilter === "all" || s.paymentStatus === paymentFilter;
    return matchSearch && matchPayment;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("students")}</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {t("addStudent")}
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="ps-9" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "paid", "pending", "overdue"].map((s) => (
            <button
              key={s}
              onClick={() => setPaymentFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                paymentFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noData")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("name")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("course")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("progress")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("paymentStatus")}</th>
                  <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t("enrolledAt")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-32 truncate">
                      {student.courseName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{student.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusBadge[student.status])}>
                        {t(student.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", paymentBadge[student.paymentStatus])}>
                        {t(student.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(student.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/students/${student.id}`} className="text-muted-foreground hover:text-primary">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteStudent.mutate({ id: student.id })}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          <DialogHeader><DialogTitle>{t("addStudent")}</DialogTitle></DialogHeader>
          <form
            onSubmit={handleSubmit((data) =>
              createStudent.mutate({
                data: {
                  name: data.name,
                  email: data.email,
                  phone: data.phone || undefined,
                  courseId: data.courseId ? parseInt(data.courseId) : undefined,
                  status: data.status,
                  paymentStatus: data.paymentStatus,
                },
              })
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("name")} *</label>
                <Input {...register("name", { required: true })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">{t("email")} *</label>
                <Input {...register("email", { required: true })} type="email" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("phone")}</label>
              <Input {...register("phone")} className="mt-1" placeholder="+1234567890" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("course")}</label>
              <select
                {...register("courseId")}
                className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
              >
                <option value="">{t("all")}</option>
                {(courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("status")}</label>
                <select {...register("status")} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm">
                  <option value="active">{t("active")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="inactive">{t("inactive")}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("paymentStatus")}</label>
                <select {...register("paymentStatus")} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm">
                  <option value="pending">{t("pending")}</option>
                  <option value="paid">{t("paid")}</option>
                  <option value="overdue">{t("overdue")}</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={createStudent.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
