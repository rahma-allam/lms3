import { useState } from "react";
import { useInstructorAuth } from "@/lib/instructorAuth";
import { useLocation } from "wouter";
import { MessageSquare, BookOpen, LogOut, GraduationCap, Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function InstructorDashboard() {
  const { instructor, token, logout } = useInstructorAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // جلب الكورسات المسندة للمدرب فقط
  const { data: allCourses = [] } = useQuery({
    queryKey: ["/api/instructors", instructor?.id, "courses"],
    queryFn: () => fetch(`/api/instructors/${instructor!.id}/courses`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!instructor?.id,
  });

  // جلب رسائل الكورس المختار
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chat", selectedCourse?.id],
    queryFn: () => fetch(`/api/instructors/chat/${selectedCourse!.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()),
    enabled: !!selectedCourse,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("senderType", "instructor");
      form.append("senderId", String(instructor!.id));
      form.append("senderName", instructor!.nameAr || instructor!.name);
      if (message.trim()) form.append("content", message.trim());
      files.forEach(f => form.append("attachments", f));

      return fetch(`/api/instructors/chat/${selectedCourse.id}`, {
        method: "POST",
        body: form,
      }).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/chat", selectedCourse?.id] });
      setMessage("");
      setFiles([]);
    },
  });

  const handleLogout = () => { logout(); navigate("/instructor/login"); };

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
          <p className="text-[11px] font-semibold text-sidebar-foreground/40 px-3 mb-2 uppercase tracking-wider">كوراساتي</p>
          {allCourses.map((course: any) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className={cn(
                "sidebar-nav-item w-full text-right",
                selectedCourse?.id === course.id && "active"
              )}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {!selectedCourse ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">اختر كورس من القائمة لتبدأ الشات</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-16 border-b border-border px-6 flex items-center gap-3 bg-card">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{selectedCourse.titleAr || selectedCourse.title}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm pt-10">
                  لا توجد رسائل بعد — ابدأ المحادثة!
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isMe = msg.senderType === "instructor" && msg.senderId === instructor?.id;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isMe ? "justify-start" : "justify-end")}>
                      <div className={cn(
                        "max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 text-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-card-border rounded-tl-sm"
                      )}>
                        {!isMe && <p className="text-[11px] font-semibold mb-1 text-muted-foreground">{msg.senderName}</p>}
                        {msg.content && <p>{msg.content}</p>}
                        {msg.attachments?.map((att: any) => (
                          <a key={att.id}
                            href={`/api/instructors/attachments/${att.storedFilename}`}
                            target="_blank"
                            className={cn(
                              "flex items-center gap-1.5 text-xs mt-1 underline",
                              isMe ? "text-primary-foreground/80" : "text-primary"
                            )}>
                            <Paperclip className="w-3 h-3" />
                            {att.filename}
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
            </div>

            {/* Files preview */}
            {files.length > 0 && (
              <div className="px-4 flex gap-2 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs">
                    <Paperclip className="w-3 h-3" />
                    {f.name}
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
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
                <Button
                  size="icon"
                  onClick={() => sendMutation.mutate()}
                  disabled={(!message.trim() && !files.length) || sendMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}