// artifacts/lms-platform/src/pages/Instructors.tsx

import { useState } from "react";
import { Plus, Trash2, Edit2, BookOpen, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import ChatBox from "@/components/ChatBox";

const fetchInstructors = () => fetch("/api/instructors").then((r) => r.json());
const fetchCourses = () => fetch("/api/courses").then((r) => r.json());

export default function Instructors() {
  const qc = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [editInstructor, setEditInstructor] = useState<any>(null);
  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [chatDialog, setChatDialog] = useState<any>(null); // { instructor, courseId }

  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ["/api/instructors"],
    queryFn: fetchInstructors,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["/api/courses"],
    queryFn: fetchCourses,
  });

 const form = useForm<{
  name: string; nameAr: string; email: string;
  password: string; phone: string; bio: string; bioAr: string;
}>();

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/instructors"] });
      setAddDialog(false);
      form.reset();
      toast.success("تمت إضافة المدرب");
    },
    onError: () => toast.error("فشل إضافة المدرب"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      fetch(`/api/instructors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/instructors"] });
      setEditInstructor(null);
      toast.success("تم تعديل بيانات المدرب");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/instructors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast.success("تم حذف المدرب");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ instructorId, courseId }: any) =>
      fetch(`/api/instructors/${instructorId}/assign-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        return data;
      }),
    onSuccess: () => {
      setAssignDialog(null);
      toast.success("تم إسناد الكورس للمدرب");
    },
    onError: (e: any) => toast.error(e.message || "فشل إسناد الكورس"),
  });

  const InstructorForm = ({ onSubmit, loading, isEdit }: { onSubmit: (d: any) => void; loading: boolean; isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">الاسم *</label>
          <Input {...form.register("name", { required: true })} className="mt-1" placeholder="Ahmed Ali" />
        </div>
        <div>
          <label className="text-sm font-medium">الاسم بالعربية</label>
          <Input {...form.register("nameAr")} className="mt-1" dir="rtl" placeholder="أحمد علي" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">الإيميل *</label>
        <Input {...form.register("email", { required: true })} type="email" className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">
          {isEdit ? "كلمة السر الجديدة (اتركها فاضية لو مش عايز تغيرها)" : "كلمة السر *"}
        </label>
        <Input
          {...form.register("password", { required: !isEdit })}
          type="password"
          className="mt-1"
          placeholder={isEdit ? "اتركها فاضية لو مش عايز تغيرها" : "••••••••"}
        />
      </div>
      <div>
        <label className="text-sm font-medium">الهاتف</label>
        <Input {...form.register("phone")} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">نبذة بالعربية</label>
        <Input {...form.register("bioAr")} className="mt-1" dir="rtl" />
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" type="button" onClick={() => { setAddDialog(false); setEditInstructor(null); }}>إلغاء</Button>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={loading}>حفظ</Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المدربين</h1>
        <Button onClick={() => { form.reset(); setAddDialog(true); }} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مدرب
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا يوجد مدربين بعد</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {instructors.map((instructor: any) => (
            <div key={instructor.id} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{instructor.nameAr || instructor.name}</p>
                    <p className="text-xs text-muted-foreground">{instructor.email}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  instructor.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}>
                  {instructor.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>

              {instructor.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {instructor.phone}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs flex-1"
                  onClick={() => setAssignDialog(instructor)}>
                  <BookOpen className="w-3 h-3" />
                  إسناد كورس
                </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { setEditInstructor(instructor); form.reset({ ...instructor, password: "" }); }}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => confirm("حذف المدرب؟") && deleteMutation.mutate(instructor.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إضافة مدرب جديد</DialogTitle></DialogHeader>
          <InstructorForm onSubmit={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editInstructor} onOpenChange={(o) => !o && setEditInstructor(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">تعديل بيانات المدرب</DialogTitle></DialogHeader>
          <InstructorForm
            onSubmit={(d) => updateMutation.mutate({ id: editInstructor?.id, ...d })}
            loading={updateMutation.isPending}
            isEdit
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              إسناد كورس لـ {assignDialog?.nameAr || assignDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto py-2">
            {courses.map((course: any) => (
              <button key={course.id}
                onClick={() => assignMutation.mutate({ instructorId: assignDialog?.id, courseId: course.id })}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-right transition-colors">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{course.titleAr || course.title}</p>
                  <p className="text-xs text-muted-foreground">${course.price}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}