import { useState } from "react";
import { Plus, Trash2, Edit2, Ticket, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Coupon = {
  id: number; code: string; discountType: string; discountValue: number;
  maxUses: number | null; usedCount: number; courseId: number | null;
  expiresAt: string | null; isActive: boolean; createdAt: string;
};
const fetchWithAuth = (url: string, options?: RequestInit) => {
  const token = localStorage.getItem("lms_admin_token");
  const tenant = localStorage.getItem("tenant_slug");
  const sep = url.includes("?") ? "&" : "?";
  return fetch(`${url}${tenant ? `${sep}tenant=${tenant}` : ""}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
};

const fetchCoupons =  (): Promise<Coupon[]> => 
  fetchWithAuth("/api/categories").then((r) => r.json());

export default function Coupons() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);

  const { data: coupons = [], isLoading } = useQuery({ queryKey: ["/api/coupons"], queryFn: fetchCoupons });

  const form = useForm<{ code: string; discountType: string; discountValue: number; maxUses: string; expiresAt: string; isActive: boolean }>();

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/coupons"] }); setAddDialog(false); form.reset(); toast.success("Coupon created"); },
    onError: (e: any) => toast.error(e.message || "Failed to create coupon"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => fetch(`/api/coupons/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/coupons"] }); setEditCoupon(null); toast.success("Coupon updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/coupons"] }); toast.success("Coupon deleted"); },
  });

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      discountValue: parseFloat(data.discountValue),
      maxUses: data.maxUses ? parseInt(data.maxUses) : null,
      expiresAt: data.expiresAt || null,
      isActive: data.isActive !== false,
    };
    if (editCoupon) updateMutation.mutate({ id: editCoupon.id, ...payload });
    else createMutation.mutate(payload);
  };

  const openEdit = (c: Coupon) => {
    setEditCoupon(c);
    form.reset({ code: c.code, discountType: c.discountType, discountValue: c.discountValue, maxUses: c.maxUses ? String(c.maxUses) : "", expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "", isActive: c.isActive });
  };

  const openAdd = () => { setEditCoupon(null); form.reset({ code: "", discountType: "percentage", discountValue: 10, maxUses: "", expiresAt: "", isActive: true }); setAddDialog(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("coupons")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("couponsDesc")}</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="w-4 h-4" /> {t("addCoupon")}</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t("noData")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4">
              <Ticket className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-sm">{c.code}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", c.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.discountType === "percentage" ? `${c.discountValue}% off` : `$${c.discountValue} off`}
                  {c.maxUses ? ` · ${c.usedCount}/${c.maxUses} uses` : ` · ${c.usedCount} uses`}
                  {c.expiresAt ? ` · Expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm(t("confirmDelete"))) deleteMutation.mutate(c.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addDialog || !!editCoupon} onOpenChange={(o) => { if (!o) { setAddDialog(false); setEditCoupon(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCoupon ? t("edit") : t("addCoupon")}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Code *</label>
              <Input {...form.register("code", { required: true })} className="mt-1 font-mono uppercase" placeholder="SUMMER20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Discount Type *</label>
                <select {...form.register("discountType")} className="mt-1 w-full h-10 px-3 border border-input rounded-md bg-background text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Value *</label>
                <Input {...form.register("discountValue", { required: true, min: 0 })} type="number" step="0.01" className="mt-1" placeholder="10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Max Uses (blank = unlimited)</label>
                <Input {...form.register("maxUses")} type="number" className="mt-1" placeholder="∞" />
              </div>
              <div>
                <label className="text-sm font-medium">Expires At</label>
                <Input {...form.register("expiresAt")} type="date" className="mt-1" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => { setAddDialog(false); setEditCoupon(null); }}>{t("cancel")}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
