import { useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import {
  useListCourses,
  useCreateCourse,
  useDeleteCourse,
  getListCoursesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, BookOpen, Users, Search, MoreVertical, Trash2, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground",
};

export default function Courses() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: courses, isLoading } = useListCourses(
    {},
    { query: { queryKey: getListCoursesQueryKey() } }
  );

  const createCourse = useCreateCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setDialogOpen(false);
        reset();
        toast.success("تم إنشاء الكورس بنجاح");
      },
      onError: (error: any) => {
        console.error("Create Error:", error);
        toast.error("فشل في إنشاء الكورس - تأكد من إدخال البيانات المطلوبة");
      },
    },
  });

  const deleteCourse = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast.success("تم حذف الكورس");
      },
      onError: () => toast.error("فشل في حذف الكورس"),
    },
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
    staleTime: 60_000,
  });

  const { register, handleSubmit, reset } = useForm<{
    title: string;
    titleAr: string;
    description: string;
    price: number;
    status: "active" | "draft" | "archived";
    courseType: "recorded" | "live";
    categoryId: string;
    level: string;
    language: string;
    totalHours: string;
    isFeatured: boolean;
  }>({
    defaultValues: { 
      status: "draft", 
      price: 0, 
      courseType: "recorded",
      level: "",
      language: "ar",
      totalHours: "",
      isFeatured: false,
    },
  });

 const coursesArray = Array.isArray(courses) 
  ? courses 
  : (courses as any)?.data || []; // جرب الوصول لـ .data لو كان Object

const filtered = coursesArray.filter((c: any) => {
  const matchSearch =
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.titleAr && c.titleAr.includes(search));
  const matchStatus = statusFilter === "all" || c.status === statusFilter;
  return matchSearch && matchStatus;
});

const onSubmit = (data: any) => {
  createCourse.mutate({
    data: {
      title: data.title,
      titleAr: data.titleAr || null,
      description: data.description || null,
      price: Number(data.price),
      status: data.status,
      courseType: data.courseType || "recorded",
      categoryId: data.categoryId ? Number(data.categoryId) : undefined,
      level: data.level || undefined,
      language: data.language || undefined,
      totalHours: data.totalHours ? Number(data.totalHours) : undefined,
      isFeatured: !!data.isFeatured,
    },
  });
};
  return (
    <div className="space-y-5 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">{t("courses")}</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة كورس جديد
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "draft", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noData")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course: any) => (
            <div
              key={course.id}
              className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusColors[course.status])}>
                    {t(course.status)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem asChild>
                        <Link href={`/courses/${course.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Eye className="w-4 h-4" />
                          عرض التفاصيل
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive cursor-pointer"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من الحذف؟"))
                            deleteCourse.mutate({ id: course.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex-1 min-w-0 text-right">
                <h3 className="font-semibold text-sm text-foreground truncate">{course.titleAr || course.title}</h3>
                {course.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {course.studentCount}
                  </span>
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                    {course.courseType === "live" ? "مباشر" : "مسجل"}
                  </span>
                </div>
                <span className="text-sm font-bold text-primary">${course.price}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إضافة دورة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">اسم الكورس (EN) *</label>
              <Input {...register("title", { required: true })} className="mt-1" placeholder="مثلاً: UI/UX Design" />
            </div>
            <div>
              <label className="text-sm font-medium">الاسم بالعربية</label>
              <Input {...register("titleAr")} className="mt-1" placeholder="مثلاً: تصميم الواجهات" />
            </div>
            <div>
              <label className="text-sm font-medium">وصف مختصر</label>
              <Input {...register("description")} className="mt-1" placeholder="وصف سريع للكورس..." />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">السعر ($) *</label>
                <Input {...register("price", { required: true })} type="number" min="0" step="0.01" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">حالة الكورس *</label>
                <select
                  {...register("status")}
                  className="mt-1 w-full h-10 px-3 border border-input rounded-md bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="draft">مسودة (Draft)</option>
                  <option value="active">نشط (Active)</option>
                  <option value="archived">مؤرشف (Archived)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">نوع الكورس *</label>
              <select
                {...register("courseType")}
                className="mt-1 w-full h-10 px-3 border border-input rounded-md bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="recorded">دروس مسجلة</option>
                <option value="live">بث مباشر</option>
              </select>
            </div>

            {categories && categories.length > 0 && (
              <div>
                <label className="text-sm font-medium">التصنيف</label>
                <select
                  {...register("categoryId")}
                  className="mt-1 w-full h-10 px-3 border border-input rounded-md bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- بدون تصنيف --</option>
                  {(Array.isArray(categories) ? categories : []).map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.nameAr || cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">المستوى</label>
                <select
                  {...register("level")}
                  className="mt-1 w-full h-10 px-3 border border-input rounded-md bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- أي مستوى --</option>
                  <option value="beginner">مبتدئ</option>
                  <option value="intermediate">متوسط</option>
                  <option value="advanced">متقدم</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">اللغة</label>
                <select
                  {...register("language")}
                  className="mt-1 w-full h-10 px-3 border border-input rounded-md bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="ar-en">عربي / إنجليزي</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">عدد الساعات</label>
                <Input {...register("totalHours")} type="number" min="0" step="0.5" className="mt-1" placeholder="مثلاً: 12" />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input type="checkbox" id="isFeatured" {...register("isFeatured")} className="w-4 h-4 accent-primary" />
                <label htmlFor="isFeatured" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  كورس مميز
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" className="flex-1" disabled={createCourse.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}