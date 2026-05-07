// import { useState } from "react";
// import { useParams, useLocation } from "wouter";
// import { useI18n } from "@/lib/i18n";
// import {
//   useGetCourse,
//   useCreateModule,
//   useCreateLesson,
//   useDeleteLesson,
//   getGetCourseQueryKey,
// } from "@workspace/api-client-react";
// import { useQueryClient } from "@tanstack/react-query";
// import { ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Video, FileText, Type } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";

// const lessonIcons: Record<string, React.ReactNode> = {
//   video: <Video className="w-3.5 h-3.5 text-blue-500" />,
//   pdf: <FileText className="w-3.5 h-3.5 text-red-500" />,
//   text: <Type className="w-3.5 h-3.5 text-green-500" />,
// };

// export default function CourseDetail() {
//   const { id } = useParams<{ id: string }>();
//   const courseId = parseInt(id!);
//   const { t } = useI18n();
//   const qc = useQueryClient();
//   const [, navigate] = useLocation();
//   const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
//   const [moduleDialog, setModuleDialog] = useState(false);
//   const [lessonDialog, setLessonDialog] = useState<number | null>(null);

//   const { data: course, isLoading } = useGetCourse(courseId, {
//     query: { queryKey: getGetCourseQueryKey(courseId) },
//   });

//   const createModule = useCreateModule({
//     mutation: {
//       onSuccess: () => {
//         qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
//         setModuleDialog(false);
//         moduleForm.reset();
//         toast.success("Module added");
//       },
//     },
//   });

//   const createLesson = useCreateLesson({
//     mutation: {
//       onSuccess: (_, vars) => {
//         qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
//         setLessonDialog(null);
//         lessonForm.reset();
//         toast.success("Lesson added");
//         setExpandedModules((prev) => new Set([...prev, vars.moduleId]));
//       },
//     },
//   });

//   const deleteLesson = useDeleteLesson({
//     mutation: {
//       onSuccess: () => {
//         qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
//         toast.success("Lesson deleted");
//       },
//     },
//   });

//   const moduleForm = useForm<{ title: string; titleAr: string; order: number }>({
//     defaultValues: { order: 1 },
//   });

//   const lessonForm = useForm<{
//     title: string;
//     titleAr: string;
//     type: "video" | "pdf" | "text";
//     videoUrl: string;
//     pdfUrl: string;
//     duration: number;
//     order: number;
//   }>({
//     defaultValues: { type: "video", order: 1 },
//   });

//   const toggleModule = (id: number) => {
//     setExpandedModules((prev) => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });
//   };

//   if (isLoading) {
//     return (
//       <div className="max-w-4xl mx-auto space-y-4">
//         <div className="h-8 w-48 bg-muted animate-pulse rounded" />
//         <div className="h-32 bg-card border border-card-border rounded-xl animate-pulse" />
//       </div>
//     );
//   }

//   if (!course) return <div className="text-center py-16 text-muted-foreground">Course not found</div>;

//   return (
//     <div className="max-w-4xl mx-auto space-y-5">
//       <div className="flex items-center gap-3">
//         <button
//           onClick={() => navigate("/courses")}
//           className="text-muted-foreground hover:text-foreground"
//         >
//           <ChevronLeft className="w-5 h-5" />
//         </button>
//         <div className="flex-1 min-w-0">
//           <h1 className="text-xl font-bold truncate">{course.title}</h1>
//           {course.titleAr && <p className="text-sm text-muted-foreground" dir="rtl">{course.titleAr}</p>}
//         </div>
//         <div className="flex items-center gap-3 shrink-0">
//           <span className="text-lg font-bold text-primary">${course.price}</span>
//           <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{t(course.status)}</span>
//         </div>
//       </div>

//       {course.description && (
//         <p className="text-sm text-muted-foreground">{course.description}</p>
//       )}

//       <div className="flex items-center justify-between">
//         <h2 className="text-sm font-semibold">{t("modules")} ({course.modules?.length ?? 0})</h2>
//         <Button size="sm" variant="outline" onClick={() => setModuleDialog(true)} className="gap-1.5">
//           <Plus className="w-3.5 h-3.5" />
//           {t("addModule")}
//         </Button>
//       </div>

//       <div className="space-y-3">
//         {(course.modules ?? []).map((mod) => {
//           const expanded = expandedModules.has(mod.id);
//           return (
//             <div key={mod.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
//               <button
//                 className="w-full flex items-center justify-between px-4 py-3 text-start hover:bg-accent/50 transition-colors"
//                 onClick={() => toggleModule(mod.id)}
//               >
//                 <div className="flex items-center gap-3">
//                   {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
//                   <span className="text-sm font-medium">{mod.title}</span>
//                   {mod.titleAr && <span className="text-xs text-muted-foreground" dir="rtl">| {mod.titleAr}</span>}
//                 </div>
//                 <span className="text-xs text-muted-foreground">{mod.lessonCount} lessons</span>
//               </button>

//               {expanded && (
//                 <div className="border-t border-border px-4 py-3 space-y-2 bg-background/50">
//                   {(mod.lessons ?? []).map((lesson) => (
//                     <div key={lesson.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/50 group">
//                       {lessonIcons[lesson.type]}
//                       <div className="flex-1 min-w-0">
//                         <p className="text-sm truncate">{lesson.title}</p>
//                         {lesson.duration && (
//                           <p className="text-xs text-muted-foreground">{lesson.duration} min</p>
//                         )}
//                       </div>
//                       <button
//                         onClick={() => deleteLesson.mutate({ id: lesson.id })}
//                         className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
//                       >
//                         <Trash2 className="w-3.5 h-3.5" />
//                       </button>
//                     </div>
//                   ))}
//                   <button
//                     onClick={() => {
//                       setLessonDialog(mod.id);
//                       lessonForm.setValue("order", (mod.lessonCount ?? 0) + 1);
//                     }}
//                     className="w-full flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
//                   >
//                     <Plus className="w-3.5 h-3.5" />
//                     {t("addLesson")}
//                   </button>
//                 </div>
//               )}
//             </div>
//           );
//         })}

//         {(course.modules ?? []).length === 0 && (
//           <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
//             <p className="text-sm">No modules yet. Add your first module above.</p>
//           </div>
//         )}
//       </div>

//       <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
//         <DialogContent>
//           <DialogHeader><DialogTitle>{t("addModule")}</DialogTitle></DialogHeader>
//           <form
//             onSubmit={moduleForm.handleSubmit((data) =>
//               createModule.mutate({
//                 courseId,
//                 data: { title: data.title, titleAr: data.titleAr || undefined, order: data.order },
//               })
//             )}
//             className="space-y-4"
//           >
//             <div>
//               <label className="text-sm font-medium">{t("name")} *</label>
//               <Input {...moduleForm.register("title", { required: true })} className="mt-1" />
//             </div>
//             <div>
//               <label className="text-sm font-medium">{t("titleAr")}</label>
//               <Input {...moduleForm.register("titleAr")} className="mt-1" dir="rtl" />
//             </div>
//             <div>
//               <label className="text-sm font-medium">{t("order")}</label>
//               <Input {...moduleForm.register("order", { valueAsNumber: true })} type="number" min="1" className="mt-1" />
//             </div>
//             <DialogFooter>
//               <Button variant="outline" type="button" onClick={() => setModuleDialog(false)}>{t("cancel")}</Button>
//               <Button type="submit" disabled={createModule.isPending}>{t("save")}</Button>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={lessonDialog !== null} onOpenChange={(o) => !o && setLessonDialog(null)}>
//         <DialogContent>
//           <DialogHeader><DialogTitle>{t("addLesson")}</DialogTitle></DialogHeader>
//           <form
//             onSubmit={lessonForm.handleSubmit((data) =>
//               createLesson.mutate({
//                 moduleId: lessonDialog!,
//                 data: {
//                   title: data.title,
//                   titleAr: data.titleAr || undefined,
//                   type: data.type,
//                   videoUrl: data.videoUrl || undefined,
//                   pdfUrl: data.pdfUrl || undefined,
//                   duration: data.duration || undefined,
//                   order: data.order,
//                 },
//               })
//             )}
//             className="space-y-4"
//           >
//             <div>
//               <label className="text-sm font-medium">{t("name")} *</label>
//               <Input {...lessonForm.register("title", { required: true })} className="mt-1" />
//             </div>
//             <div>
//               <label className="text-sm font-medium">{t("titleAr")}</label>
//               <Input {...lessonForm.register("titleAr")} className="mt-1" dir="rtl" />
//             </div>
//             <div>
//               <label className="text-sm font-medium">{t("type")}</label>
//               <select
//                 {...lessonForm.register("type")}
//                 className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
//               >
//                 <option value="video">{t("video")}</option>
//                 <option value="pdf">{t("pdf")}</option>
//                 <option value="text">{t("text")}</option>
//               </select>
//             </div>
//             <div>
//               <label className="text-sm font-medium">{t("videoUrl")}</label>
//               <Input {...lessonForm.register("videoUrl")} className="mt-1" placeholder="https://..." />
//             </div>
//             <div>
//               <label className="text-sm font-medium">{t("pdfUrl")}</label>
//               <Input {...lessonForm.register("pdfUrl")} className="mt-1" placeholder="https://..." />
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="text-sm font-medium">{t("duration")}</label>
//                 <Input {...lessonForm.register("duration", { valueAsNumber: true })} type="number" min="0" className="mt-1" />
//               </div>
//               <div>
//                 <label className="text-sm font-medium">{t("order")}</label>
//                 <Input {...lessonForm.register("order", { valueAsNumber: true })} type="number" min="1" className="mt-1" />
//               </div>
//             </div>
//             <DialogFooter>
//               <Button variant="outline" type="button" onClick={() => setLessonDialog(null)}>{t("cancel")}</Button>
//               <Button type="submit" disabled={createLesson.isPending}>{t("save")}</Button>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }


import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetCourse,
  useCreateModule,
  useCreateLesson,
  useDeleteLesson,
  useCreateCourseSession,
  getGetCourseQueryKey,
} from "@workspace/api-client-react";
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2,
  Video, FileText, Type, Radio, Calendar, Clock, Link2,
  Lock, Eye, EyeOff, Upload, ClipboardList, CheckCircle2, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const lessonIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5 text-blue-500" />,
  pdf: <FileText className="w-3.5 h-3.5 text-red-500" />,
  text: <Type className="w-3.5 h-3.5 text-green-500" />,
};

// ─── مكون عرض رابط الميت المحمي ───────────────────────────────────────────
function ProtectedMeetingLink({ zoomLink, zoomPassword, scheduledAt, durationMinutes }: {
  zoomLink: string | null;
  zoomPassword: string | null;
  scheduledAt: string;
  durationMinutes: number;
}) {
  const [revealed, setRevealed] = useState(false);

  const sessionStart = new Date(scheduledAt);
  const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();
  // الرابط يظهر 15 دقيقة قبل البداية وحتى النهاية
  const canJoin = now >= new Date(sessionStart.getTime() - 15 * 60 * 1000) && now <= sessionEnd;

  if (!zoomLink) return <span className="text-xs text-muted-foreground">لم يُضَف رابط بعد</span>;

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {canJoin ? (
        <div className="flex items-center gap-2">
          <a
            href={zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition"
          >
            <Radio className="w-3 h-3 animate-pulse" />
            انضم للمحاضرة الآن
          </a>
          {zoomPassword && (
            <button
              onClick={() => setRevealed((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {revealed ? zoomPassword : "عرض كلمة السر"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          الرابط سيظهر قبل المحاضرة بـ 15 دقيقة
        </div>
      )}
    </div>
  );
}

// ─── مكون رفع فيديو محمي ──────────────────────────────────────────────────
function ProtectedVideoPlayer({ lessonId, videoUrl }: { lessonId: number; videoUrl: string | null }) {
  const [tokenUrl, setTokenUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getSignedUrl = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/signed-url`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setTokenUrl(url);
    } catch {
      toast.error("فشل تحميل الفيديو");
    } finally {
      setLoading(false);
    }
  };

  if (!videoUrl) return <span className="text-xs text-muted-foreground">لا يوجد فيديو</span>;

  return tokenUrl ? (
    <video
      src={tokenUrl}
      controls
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className="w-full rounded-lg mt-2 max-h-64"
    />
  ) : (
    <button
      onClick={getSignedUrl}
      disabled={loading}
      className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
    >
      <Video className="w-3 h-3" />
      {loading ? "جاري التحميل..." : "مشاهدة الفيديو"}
    </button>
  );
}

// ─── Feature 5: Quiz Management Dialog ──────────────────────────────────────
function QuizManagerDialog({ lessonId, open, onClose }: { lessonId: number; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [questions, setQuestions] = useState<{ questionText: string; options: string[]; correctIndex: number }[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [saving, setSaving] = useState(false);

  const { data: existingQuiz, refetch: refetchQuiz } = useQuery<any>({
    queryKey: ["quiz-lesson", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/lesson/${lessonId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: open && !!lessonId,
  });

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { questionText: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
  };

  const updateQuestion = (qi: number, field: "questionText" | "correctIndex", value: string | number) => {
    setQuestions((prev) => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q
    ));
  };

  const saveQuiz = async () => {
    if (!quizTitle.trim() || questions.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        title: quizTitle,
        passingScore,
        questions: questions.map((q, i) => ({ ...q, order: i })),
      };
      const res = await fetch(`/api/quizzes/lesson/${lessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save quiz");
      toast.success("تم إنشاء الاختبار");
      await refetchQuiz();
      setQuestions([]);
      setQuizTitle("");
    } catch {
      toast.error("فشل حفظ الاختبار");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async () => {
    if (!existingQuiz) return;
    setSaving(true);
    try {
      await fetch(`/api/quizzes/${existingQuiz.id}`, { method: "DELETE" });
      toast.success("تم حذف الاختبار");
      await refetchQuiz();
    } catch {
      toast.error("فشل حذف الاختبار");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            إدارة الاختبار
          </DialogTitle>
        </DialogHeader>

        {existingQuiz ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {existingQuiz.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {existingQuiz.questions?.length ?? 0} أسئلة · درجة النجاح: {existingQuiz.passingScore}%
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={deleteQuiz}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {existingQuiz.questions?.map((q: any, qi: number) => (
                <div key={q.id} className="border border-border rounded-lg p-3 text-sm">
                  <p className="font-medium">{qi + 1}. {q.questionText}</p>
                  <div className="mt-2 grid gap-1">
                    {q.options.map((opt: string, oi: number) => (
                      <span key={oi} className={cn(
                        "text-xs px-2 py-1 rounded",
                        oi === q.correctIndex ? "bg-emerald-100 text-emerald-700 font-medium" : "text-muted-foreground"
                      )}>
                        {oi + 1}. {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">عنوان الاختبار *</label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="mt-1"
                placeholder="مثال: اختبار الوحدة الأولى"
              />
            </div>
            <div>
              <label className="text-sm font-medium">درجة النجاح (%)</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value))}
                className="mt-1 w-24"
              />
            </div>

            <div className="space-y-3">
              {questions.map((q, qi) => (
                <div key={qi} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">السؤال {qi + 1}</span>
                    <button
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="نص السؤال"
                    value={q.questionText}
                    onChange={(e) => updateQuestion(qi, "questionText", e.target.value)}
                  />
                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctIndex === oi}
                          onChange={() => updateQuestion(qi, "correctIndex", oi)}
                          className="accent-emerald-500 shrink-0"
                        />
                        <Input
                          placeholder={`الخيار ${oi + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">اختر الإجابة الصحيحة بالضغط على الزر الدائري</p>
                </div>
              ))}
            </div>

            <button
              onClick={addQuestion}
              className="w-full flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-accent rounded-lg border border-dashed border-border transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة سؤال
            </button>

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={onClose}>إلغاء</Button>
              <Button
                onClick={saveQuiz}
                disabled={saving || !quizTitle.trim() || questions.length === 0}
              >
                {saving ? "جاري الحفظ..." : "حفظ الاختبار"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id!);
  const { t } = useI18n();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [moduleDialog, setModuleDialog] = useState(false);
  const [lessonDialog, setLessonDialog] = useState<number | null>(null);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [videoUploadLesson, setVideoUploadLesson] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  // Feature 5: Quiz management
  const [quizLesson, setQuizLesson] = useState<number | null>(null);
  // PDF upload
  const [pdfUploadLesson, setPdfUploadLesson] = useState<number | null>(null);
  // Admin chat view
  const [chatCourseId, setChatCourseId] = useState<number | null>(null);

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { queryKey: getGetCourseQueryKey(courseId) },
  });

  const createModule = useCreateModule({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        setModuleDialog(false);
        moduleForm.reset();
        toast.success("تمت إضافة الوحدة");
      },
    },
  });

  const createLesson = useCreateLesson({
    mutation: {
      onSuccess: (_, vars) => {
        qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        setLessonDialog(null);
        lessonForm.reset();
        toast.success("تمت إضافة الدرس");
        setExpandedModules((prev) => new Set([...prev, vars.moduleId]));
      },
    },
  });

  const deleteLesson = useDeleteLesson({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        toast.success("تم حذف الدرس");
      },
    },
  });

  const createSession = useCreateCourseSession({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        setSessionDialog(false);
        sessionForm.reset();
        toast.success("تمت إضافة الجلسة");
      },
      onError: () => toast.error("فشل إضافة الجلسة"),
    },
  });

  const moduleForm = useForm<{ title: string; titleAr: string; order: number }>({
    defaultValues: { order: 1 },
  });

  const lessonForm = useForm<{
    title: string; titleAr: string;
    type: "video" | "pdf" | "text";
    videoUrl: string; pdfUrl: string;
    duration: number; order: number;
  }>({ defaultValues: { type: "video", order: 1 } });

  const sessionForm = useForm<{
    title: string; titleAr: string;
    scheduledAt: string; durationMinutes: number;
    zoomLink: string; zoomPassword: string; order: number;
  }>({ defaultValues: { durationMinutes: 90, order: 1 } });

  const lessonType = lessonForm.watch("type");

  const toggleModule = (id: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // رفع فيديو مباشرة للسيرفر
  const handleVideoUpload = async (lessonId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch(`/api/lessons/${lessonId}/upload-video`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      toast.success("تم رفع الفيديو بنجاح");
      setVideoUploadLesson(null);
    } catch {
      toast.error("فشل رفع الفيديو");
    } finally {
      setUploading(false);
    }
  };

  const handlePdfUpload = async (lessonId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`/api/lessons/${lessonId}/upload-pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      toast.success("تم رفع الـ PDF بنجاح");
      setPdfUploadLesson(null);
    } catch {
      toast.error("فشل رفع الـ PDF");
    } finally {
      setUploading(false);
    }
  };

  const isLive = course?.courseType === "live";

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-card border border-card-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!course) return <div className="text-center py-16 text-muted-foreground">الكورس غير موجود</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/courses")} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{course.titleAr || course.title}</h1>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
              isLive
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            )}>
              {isLive ? "🔴 مباشر" : "🎬 مسجل"}
            </span>
          </div>
          {course.title && course.titleAr && (
            <p className="text-sm text-muted-foreground">{course.title}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setChatCourseId(courseId)} className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            شات الكورس
          </Button>
          <span className="text-lg font-bold text-primary">${course.price}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{t(course.status)}</span>
        </div>
      </div>

      {course.description && (
        <p className="text-sm text-muted-foreground">{course.description}</p>
      )}

      {/* ═══ كورس مباشر: الجلسات ════════════════════════════════════════ */}
      {isLive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              الجلسات المباشرة ({(course as any).sessions?.length ?? 0})
            </h2>
            <Button size="sm" variant="outline" onClick={() => setSessionDialog(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              إضافة جلسة
            </Button>
          </div>

          {((course as any).sessions ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl text-sm">
              لا توجد جلسات بعد
            </div>
          ) : (
            <div className="space-y-2">
              {((course as any).sessions ?? []).map((session: any) => (
                <div key={session.id} className="bg-card border border-card-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{session.titleAr || session.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.scheduledAt).toLocaleDateString("ar-EG", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.scheduledAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <span>{session.durationMinutes} دقيقة</span>
                      </div>
                    </div>
                  </div>
                  {/* رابط الميت المحمي */}
                  <ProtectedMeetingLink
                    zoomLink={session.zoomLink}
                    zoomPassword={session.zoomPassword}
                    scheduledAt={session.scheduledAt}
                    durationMinutes={session.durationMinutes}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ كورس مسجل: الوحدات والدروس ════════════════════════════════ */}
      {!isLive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("modules")} ({course.modules?.length ?? 0})</h2>
            <Button size="sm" variant="outline" onClick={() => setModuleDialog(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {t("addModule")}
            </Button>
          </div>

          <div className="space-y-3">
            {(course.modules ?? []).map((mod) => {
              const expanded = expandedModules.has(mod.id);
              return (
                <div key={mod.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-start hover:bg-accent/50 transition-colors"
                    onClick={() => toggleModule(mod.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm font-medium">{mod.titleAr || mod.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{mod.lessonCount} دروس</span>
                  </button>

                  {expanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2 bg-background/50">
                      {(mod.lessons ?? []).map((lesson) => (
                        <div key={lesson.id} className="flex flex-col gap-1 py-2 px-3 rounded-lg hover:bg-accent/50 group">
                          <div className="flex items-center gap-3">
                            {lessonIcons[lesson.type]}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{lesson.titleAr || lesson.title}</p>
                              {lesson.duration && (
                                <p className="text-xs text-muted-foreground">{lesson.duration} دقيقة</p>
                              )}
                            </div>
                            {/* Feature 5: زرار إدارة الاختبار */}
                            <button
                              onClick={() => setQuizLesson(lesson.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              title="إدارة الاختبار"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                            </button>
                            {/* زرار رفع فيديو */}
                            {lesson.type === "video" && (
                              <button
                                onClick={() => setVideoUploadLesson(lesson.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                title="رفع فيديو"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* زرار رفع PDF */}
                            {lesson.type === "pdf" && (
                              <button
                                onClick={() => setPdfUploadLesson(lesson.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                title="رفع PDF"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteLesson.mutate({ id: lesson.id })}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* مشغّل الفيديو المحمي */}
                          {lesson.type === "video" && lesson.videoUrl && (
                            <div className="pr-6">
                              <ProtectedVideoPlayer lessonId={lesson.id} videoUrl={lesson.videoUrl} />
                            </div>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          setLessonDialog(mod.id);
                          lessonForm.setValue("order", (mod.lessonCount ?? 0) + 1);
                        }}
                        className="w-full flex items-center gap-2 py-2 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t("addLesson")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {(course.modules ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                <p className="text-sm">لا توجد وحدات بعد. أضف أول وحدة.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Dialog: إضافة وحدة ══════════════════════════════════════════ */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">{t("addModule")}</DialogTitle></DialogHeader>
          <form
            onSubmit={moduleForm.handleSubmit((data) =>
              createModule.mutate({
                courseId,
                data: { title: data.title, titleAr: data.titleAr || undefined, order: data.order },
              })
            )}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">اسم الوحدة (EN) *</label>
              <Input {...moduleForm.register("title", { required: true })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">الاسم بالعربية</label>
              <Input {...moduleForm.register("titleAr")} className="mt-1" dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium">الترتيب</label>
              <Input {...moduleForm.register("order", { valueAsNumber: true })} type="number" min="1" className="mt-1" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => setModuleDialog(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={createModule.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: إضافة درس ═══════════════════════════════════════════ */}
      <Dialog open={lessonDialog !== null} onOpenChange={(o) => !o && setLessonDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">{t("addLesson")}</DialogTitle></DialogHeader>
          <form
            onSubmit={lessonForm.handleSubmit((data) =>
              createLesson.mutate({
                moduleId: lessonDialog!,
                data: {
                  title: data.title,
                  titleAr: data.titleAr || undefined,
                  type: data.type,
                  videoUrl: data.videoUrl || undefined,
                  pdfUrl: data.pdfUrl || undefined,
                  duration: data.duration || undefined,
                  order: data.order,
                },
              })
            )}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">عنوان الدرس *</label>
              <Input {...lessonForm.register("title", { required: true })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">العنوان بالعربية</label>
              <Input {...lessonForm.register("titleAr")} className="mt-1" dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium">نوع المحتوى</label>
              <select
                {...lessonForm.register("type")}
                className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
              >
                <option value="video">🎬 فيديو</option>
                <option value="pdf">📄 PDF</option>
                <option value="text">📝 نص</option>
              </select>
            </div>

            {/* رابط فيديو خارجي (يوتيوب unlisted مثلاً) أو سيتم الرفع بعدين */}
            {lessonType === "video" && (
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" />
                  رابط الفيديو (اختياري — يمكن الرفع لاحقاً)
                </label>
                <Input {...lessonForm.register("videoUrl")} className="mt-1" placeholder="https://..." />
              </div>
            )}

            {lessonType === "pdf" && (
              <div>
                <label className="text-sm font-medium">رابط PDF</label>
                <Input {...lessonForm.register("pdfUrl")} className="mt-1" placeholder="https://..." />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">المدة (دقائق)</label>
                <Input {...lessonForm.register("duration", { valueAsNumber: true })} type="number" min="0" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">الترتيب</label>
                <Input {...lessonForm.register("order", { valueAsNumber: true })} type="number" min="1" className="mt-1" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => setLessonDialog(null)}>{t("cancel")}</Button>
              <Button type="submit" disabled={createLesson.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: إضافة جلسة مباشرة ══════════════════════════════════ */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إضافة جلسة مباشرة</DialogTitle></DialogHeader>
          <form
            onSubmit={sessionForm.handleSubmit((data) =>
              createSession.mutate({
                id: courseId,
                data: {
                  title: data.title,
                  titleAr: data.titleAr || undefined,
                  scheduledAt: new Date(data.scheduledAt).toISOString(),
                  durationMinutes: Number(data.durationMinutes),
                  zoomLink: data.zoomLink || undefined,
                  zoomPassword: data.zoomPassword || undefined,
                  order: Number(data.order),
                },
              })
            )}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">عنوان الجلسة *</label>
              <Input {...sessionForm.register("title", { required: true })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">العنوان بالعربية</label>
              <Input {...sessionForm.register("titleAr")} className="mt-1" dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                موعد الجلسة *
              </label>
              <Input
                {...sessionForm.register("scheduledAt", { required: true })}
                type="datetime-local"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">المدة (دقائق)</label>
                <Input {...sessionForm.register("durationMinutes", { valueAsNumber: true })} type="number" min="15" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">الترتيب</label>
                <Input {...sessionForm.register("order", { valueAsNumber: true })} type="number" min="1" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" />
                رابط الميتنج (Zoom / Meet)
              </label>
              <Input {...sessionForm.register("zoomLink")} className="mt-1" placeholder="https://zoom.us/j/..." />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                كلمة سر الاجتماع (اختياري)
              </label>
              <Input {...sessionForm.register("zoomPassword")} className="mt-1" placeholder="123456" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => setSessionDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={createSession.isPending}>حفظ الجلسة</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: رفع فيديو ═══════════════════════════════════════════ */}
      <Dialog open={videoUploadLesson !== null} onOpenChange={(o) => !o && setVideoUploadLesson(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">رفع فيديو</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              اختر ملف الفيديو — سيتم تخزينه بشكل آمن ولن يتمكن الطلاب من تنزيله.
            </p>
            <label className="flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">اضغط لاختيار فيديو</span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && videoUploadLesson) handleVideoUpload(videoUploadLesson, file);
                }}
              />
            </label>
            {uploading && (
              <div className="text-center text-sm text-primary animate-pulse">جاري الرفع...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Feature 5: Dialog: إدارة الاختبار ══════════════════════════ */}
      {quizLesson !== null && (
        <QuizManagerDialog
          lessonId={quizLesson}
          open={quizLesson !== null}
          onClose={() => setQuizLesson(null)}
        />
      )}

      {/* ═══ Dialog: رفع PDF ════════════════════════════════════════════ */}
      <Dialog open={pdfUploadLesson !== null} onOpenChange={(o) => !o && setPdfUploadLesson(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">رفع PDF</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              اختر ملف الـ PDF — سيتم تخزينه بشكل آمن.
            </p>
            <label className="flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-red-400 transition-colors">
              <FileText className="w-8 h-8 text-red-400" />
              <span className="text-sm text-muted-foreground">اضغط لاختيار PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && pdfUploadLesson) handlePdfUpload(pdfUploadLesson, file);
                }}
              />
            </label>
            {uploading && (
              <div className="text-center text-sm text-primary animate-pulse">جاري الرفع...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: شات الكورس (للأدمن) ═══════════════════════════════ */}
      <Dialog open={chatCourseId !== null} onOpenChange={(o) => !o && setChatCourseId(null)}>
        <DialogContent dir="rtl" className="max-w-2xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-right">شات الكورس — {course?.titleAr || course?.title}</DialogTitle>
          </DialogHeader>
          {chatCourseId && <AdminChatViewer courseId={chatCourseId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── مكون عرض الشات للأدمن ────────────────────────────────────────────────
function AdminChatViewer({ courseId }: { courseId: number }) {
  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-chat", courseId],
    queryFn: () => fetch(`/api/instructors/chat/${courseId}`).then(r => r.json()),
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">جاري التحميل...</div>;

  if (messages.length === 0) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      لا توجد رسائل بعد في هذا الكورس
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-2">
      {messages.map((msg: any) => {
        const isInstructor = msg.senderType === "instructor";
        return (
          <div key={msg.id} className={`flex gap-2 ${isInstructor ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm ${
              isInstructor ? "bg-primary/10 border border-primary/20" : "bg-muted"
            }`}>
              <p className="text-[11px] font-medium mb-1 text-muted-foreground">
                {msg.senderName} · {isInstructor ? "مدرب" : "طالب"}
              </p>
              {msg.content && <p>{msg.content}</p>}
              {msg.attachments?.map((att: any) => (
                <a key={att.id}
                  href={`/api/instructors/attachments/${att.storedFilename}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-primary underline mt-1">
                  📎 {att.filename}
                </a>
              ))}
              <p className="text-[10px] mt-1 text-muted-foreground">
                {new Date(msg.createdAt).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}