import { useState, useRef, useEffect } from "react";
import { useInstructorAuth } from "@/lib/instructorAuth";
import { useLocation } from "wouter";
import { MessageSquare, BookOpen, LogOut, GraduationCap, Send, Paperclip, X, Upload, Video, FileText, Radio, Calendar, Clock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getTenantParam(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("tenant");
  if (fromUrl) { localStorage.setItem("tenant_slug", fromUrl); return `?tenant=${fromUrl}`; }
  const s = localStorage.getItem("tenant_slug") ?? "";
  return s ? `?tenant=${s}` : "";
}

type Tab = "chat" | "content";

export default function InstructorDashboard() {
  const { instructor, token, logout } = useInstructorAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tenantParam = getTenantParam();

  // ✅ الكورسات الخاصة بالمدرب
  const { data: allCourses = [] } = useQuery({
    queryKey: ["/api/instructors", instructor?.id, "courses"],
    queryFn: () => fetch(`/api/instructors/${instructor!.id}/courses${tenantParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
    enabled: !!instructor?.id,
  });

  // ✅ تفاصيل الكورس المختار (مع المودولز والدروس والجلسات)
  const { data: courseDetail } = useQuery({
    queryKey: ["/api/course-detail", selectedCourse?.id],
    queryFn: () => fetch(`/api/courses/${selectedCourse!.id}${tenantParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
    enabled: !!selectedCourse?.id,
  });

  // ✅ الشات
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chat", selectedCourse?.id],
    queryFn: () => fetch(`/api/instructors/chat/${selectedCourse!.id}${tenantParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
    enabled: !!selectedCourse,
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ إرسال رسالة
  const sendMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("senderType", "instructor");
      form.append("senderId", String(instructor!.id));
      form.append("senderName", instructor!.nameAr || instructor!.name);
      if (message.trim()) form.append("content", message.trim());
      files.forEach(f => form.append("attachments", f));
      const tenant = localStorage.getItem("tenant_slug");
      return fetch(`/api/instructors/chat/${selectedCourse.id}${tenant ? `?tenant=${tenant}` : ""}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/chat", selectedCourse?.id] });
      setMessage("");
      setFiles([]);
    },
    onError: () => toast.error("فشل إرسال الرسالة"),
  });

  // ✅ رفع فيديو
  const handleVideoUpload = async (lessonId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const tenant = localStorage.getItem("tenant_slug");
      const res = await fetch(`/api/lessons/${lessonId}/upload-video${tenant ? `?tenant=${tenant}` : ""}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["/api/course-detail", selectedCourse?.id] });
      toast.success("تم رفع الفيديو");
    } catch {
      toast.error("فشل رفع الفيديو");
    } finally {
      setUploading(false);
    }
  };

  // ✅ رفع PDF
  const handlePdfUpload = async (lessonId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const tenant = localStorage.getItem("tenant_slug");
      const res = await fetch(`/api/lessons/${lessonId}/upload-pdf${tenant ? `?tenant=${tenant}` : ""}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["/api/course-detail", selectedCourse?.id] });
      toast.success("تم رفع الـ PDF");
    } catch {
      toast.error("فشل رفع الـ PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    const tenant = localStorage.getItem("tenant_slug");
    navigate(tenant ? `/instructor/login?tenant=${tenant}` : "/instructor/login");
  };

  const toggleModule = (id: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isLive = selectedCourse?.courseType === "live";

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sidebar-foreground text-sm truncate">بوابة المدربين</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-sidebar-foreground/40 px-3 mb-2 uppercase tracking-wider">كورساتي</p>
          {allCourses.length === 0 && (
            <p className="text-xs text-muted-foreground px-3">لا توجد كورسات مسندة</p>
          )}
          {allCourses.map((course: any) => (
            <button
              key={course.id}
              onClick={() => { setSelectedCourse(course); setActiveTab("chat"); }}
              className={cn("sidebar-nav-item w-full text-right", selectedCourse?.id === course.id && "active")}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{course.titleAr || course.title}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-sidebar-primary text-sm font-semibold shrink-0">
              {instructor?.name?.charAt(0)?.toUpperCase() ?? "M"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{instructor?.nameAr || instructor?.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{instructor?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-sidebar-foreground/40 hover:text-destructive transition-colors shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {!selectedCourse ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">اختر كورس من القائمة</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header + Tabs */}
            <div className="border-b border-border bg-card">
              <div className="h-16 px-6 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="font-semibold flex-1">{selectedCourse.titleAr || selectedCourse.title}</h2>
              </div>
              <div className="flex px-6 gap-4">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={cn("pb-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-4 h-4 inline ml-1.5" />
                  الشات
                </button>
                <button
                  onClick={() => setActiveTab("content")}
                  className={cn("pb-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="w-4 h-4 inline ml-1.5" />
                  المحتوى
                </button>
              </div>
            </div>

            {/* ── Tab: الشات ── */}
            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm pt-10">لا توجد رسائل بعد</div>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.senderType === "instructor" && msg.senderId === instructor?.id;
                      return (
                        <div key={msg.id} className={cn("flex gap-2", isMe ? "justify-start" : "justify-end")}>
                          <div className={cn(
                            "max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 text-sm",
                            isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-card-border rounded-tl-sm"
                          )}>
                            {!isMe && <p className="text-[11px] font-semibold mb-1 text-muted-foreground">{msg.senderName}</p>}
                            {msg.content && <p>{msg.content}</p>}
                            {msg.attachments?.map((att: any) => (
                              <a key={att.id}
                                href={`/api/instructors/attachments/${att.storedFilename}`}
                                target="_blank"
                                className={cn("flex items-center gap-1.5 text-xs mt-1 underline",
                                  isMe ? "text-primary-foreground/80" : "text-primary"
                                )}>
                                <Paperclip className="w-3 h-3" />{att.filename}
                              </a>
                            ))}
                            <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                              {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {files.length > 0 && (
                  <div className="px-4 flex gap-2 flex-wrap">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs">
                        <Paperclip className="w-3 h-3" />{f.name}
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2 items-center">
                    <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                      <Paperclip className="w-5 h-5" />
                      <input type="file" multiple className="hidden"
                        onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
                    </label>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="اكتب رسالة..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMutation.mutate()}
                    />
                    <Button size="icon" onClick={() => sendMutation.mutate()}
                      disabled={(!message.trim() && !files.length) || sendMutation.isPending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: المحتوى ── */}
            {activeTab === "content" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* كورس مباشر: الجلسات */}
                {isLive && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Radio className="w-4 h-4 text-red-500" />
                      الجلسات المباشرة
                    </h3>
                    {(courseDetail?.sessions ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد جلسات بعد</p>
                    ) : (
                      (courseDetail?.sessions ?? []).map((session: any) => (
                        <div key={session.id} className="bg-card border border-card-border rounded-xl p-4 space-y-2">
                          <p className="font-medium text-sm">{session.titleAr || session.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(session.scheduledAt).toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(session.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {/* ✅ رابط الميت للمدرب دايماً ظاهر */}
                          {session.zoomLink && (
                            <a href={session.zoomLink} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90">
                              <Radio className="w-3 h-3" />
                              ابدأ المحاضرة
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* كورس مسجل: الوحدات والدروس */}
                {!isLive && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">الوحدات والمحتوى</h3>
                    {(courseDetail?.modules ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد وحدات بعد</p>
                    ) : (
                      (courseDetail?.modules ?? []).map((mod: any) => {
                        const expanded = expandedModules.has(mod.id);
                        return (
                          <div key={mod.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50"
                              onClick={() => toggleModule(mod.id)}
                            >
                              <span className="text-sm font-medium">{mod.titleAr || mod.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{mod.lessonCount} دروس</span>
                                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </button>

                            {expanded && (
                              <div className="border-t border-border px-4 py-3 space-y-3 bg-background/50">
                                {(mod.lessons ?? []).map((lesson: any) => (
                                  <div key={lesson.id} className="space-y-2 py-2 border-b border-border last:border-0">
                                    <div className="flex items-center gap-2">
                                      {lesson.type === "video" ? <Video className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                                      <span className="text-sm font-medium flex-1">{lesson.titleAr || lesson.title}</span>
                                    </div>

                                    {/* ✅ رفع فيديو */}
                                    {lesson.type === "video" && (
                                      <div className="flex items-center gap-2 pr-6">
                                        {lesson.videoUrl ? (
                                          <span className="text-xs text-emerald-600">✅ فيديو مرفوع</span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">لا يوجد فيديو</span>
                                        )}
                                        <label className="cursor-pointer">
                                          <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                                            <Upload className="w-3 h-3" />
                                            {lesson.videoUrl ? "تغيير الفيديو" : "رفع فيديو"}
                                          </div>
                                          <input type="file" accept="video/*" className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleVideoUpload(lesson.id, file);
                                            }} />
                                        </label>
                                        {uploading && <span className="text-xs text-primary animate-pulse">جاري الرفع...</span>}
                                      </div>
                                    )}

                                    {/* ✅ رفع PDF */}
                                    {lesson.type === "pdf" && (
                                      <div className="flex items-center gap-2 pr-6">
                                        {lesson.pdfUrl ? (
                                          <span className="text-xs text-emerald-600">✅ PDF مرفوع</span>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">لا يوجد PDF</span>
                                        )}
                                        <label className="cursor-pointer">
                                          <div className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                                            <Upload className="w-3 h-3" />
                                            {lesson.pdfUrl ? "تغيير الـ PDF" : "رفع PDF"}
                                          </div>
                                          <input type="file" accept="application/pdf" className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handlePdfUpload(lesson.id, file);
                                            }} />
                                        </label>
                                        {uploading && <span className="text-xs text-primary animate-pulse">جاري الرفع...</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}