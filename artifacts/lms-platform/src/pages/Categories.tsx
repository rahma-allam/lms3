import { useState } from "react";
import { Plus, Trash2, Edit2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";

type Category = { id: number; name: string; nameAr: string | null; slug: string; color: string; order: number };
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


const fetchCategories = (): Promise<Category[]> => 
  fetchWithAuth("/api/categories").then((r) => r.json());

export default function Categories() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({ queryKey: ["/api/categories"], queryFn: fetchCategories });

  const form = useForm<{ name: string; nameAr: string; slug: string; color: string; order: number }>();

  const createMutation = useMutation({
  mutationFn: (data: any) => fetchWithAuth("/api/categories", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((r) => r.json()),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/categories"] }); setAddDialog(false); form.reset(); toast.success("Category created"); },
  onError: () => toast.error("Failed to create category"),
});

const updateMutation = useMutation({
  mutationFn: ({ id, ...data }: any) => fetchWithAuth(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }).then((r) => r.json()),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/categories"] }); setEditCat(null); toast.success("Category updated"); },
});

const deleteMutation = useMutation({
  mutationFn: (id: number) => fetchWithAuth(`/api/categories/${id}`, { method: "DELETE" }),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/categories"] }); toast.success("Category deleted"); },
});

  const onSubmit = (data: any) => {
    if (!data.slug) data.slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (editCat) updateMutation.mutate({ id: editCat.id, ...data });
    else createMutation.mutate(data);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    form.reset({ name: cat.name, nameAr: cat.nameAr ?? "", slug: cat.slug, color: cat.color, order: cat.order });
  };

  const openAdd = () => { setEditCat(null); form.reset({ name: "", nameAr: "", slug: "", color: "#6366f1", order: 0 }); setAddDialog(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("categories")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("categoriesDesc")}</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> {t("addCategory")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t("noData")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ background: cat.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{cat.name}</p>
                {cat.nameAr && <p className="text-xs text-muted-foreground">{cat.nameAr}</p>}
              </div>
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">{cat.slug}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm(t("confirmDelete"))) deleteMutation.mutate(cat.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addDialog || !!editCat} onOpenChange={(o) => { if (!o) { setAddDialog(false); setEditCat(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCat ? t("edit") : t("addCategory")}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Name (EN) *</label>
                <Input {...form.register("name", { required: true })} className="mt-1" placeholder="e.g. Programming" />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم (AR)</label>
                <Input {...form.register("nameAr")} className="mt-1" placeholder="مثلاً: البرمجة" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input {...form.register("slug")} className="mt-1" placeholder="auto-generated" />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-1">
                  <Input {...form.register("color")} type="color" className="h-10 w-14 p-1 cursor-pointer" />
                  <Input {...form.register("color")} className="flex-1" placeholder="#6366f1" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("order")}</label>
              <Input {...form.register("order", { valueAsNumber: true })} type="number" className="mt-1" defaultValue={0} />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => { setAddDialog(false); setEditCat(null); }}>{t("cancel")}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
