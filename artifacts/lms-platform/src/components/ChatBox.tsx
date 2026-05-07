// artifacts/lms-platform/src/components/ChatBox.tsx
// مكوّن الشات — بيتستخدم في أي صفحة محتاجة شات

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, FileText, Image, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatBoxProps {
  courseId: number;
  // بيانات المُرسِل الحالي (المدرب أو الطالب)
  sender: {
    id: number;
    name: string;
    type: "instructor" | "student";
  };
  // لو محددين طالب = شات خاص، لو مش محددين = شات جماعي
  privateStudentId?: number;
  title?: string;
}

interface Attachment {
  id: number;
  filename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
}

interface Message {
  id: number;
  senderName: string;
  senderType: "instructor" | "student";
  senderId: number;
  content: string | null;
  createdAt: string;
  attachments: Attachment[];
}

// ─── تحويل bytes لحجم مقروء ──────────────────────────────────────────────
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ChatBox({ courseId, sender, privateStudentId, title }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── رابط الـ API ──────────────────────────────────────────────────────
  const chatUrl = privateStudentId
    ? `/api/instructors/chat/${courseId}/private/${privateStudentId}`
    : `/api/instructors/chat/${courseId}`;

  // ─── جلب الرسائل ──────────────────────────────────────────────────────
  const fetchMessages = async (initial = false) => {
    const url = initial || !lastFetch ? chatUrl : `${chatUrl}?since=${lastFetch}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data: Message[] = await res.json();
    if (data.length > 0) {
      setMessages((prev) => initial ? data : [...prev, ...data]);
      setLastFetch(data[data.length - 1]!.createdAt);
    }
  };

  // جلب أولي
  useEffect(() => {
    fetchMessages(true);
  }, [courseId, privateStudentId]);

  // Polling كل 5 ثواني
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(), 5000);
    return () => clearInterval(interval);
  }, [courseId, privateStudentId, lastFetch]);

  // scroll للأسفل عند وصول رسائل جديدة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── إرسال رسالة ──────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);

    const formData = new FormData();
    formData.append("senderType", sender.type);
    formData.append("senderId", String(sender.id));
    formData.append("senderName", sender.name);
    if (text.trim()) formData.append("content", text.trim());
    if (privateStudentId) formData.append("recipientStudentId", String(privateStudentId));
    files.forEach((f) => formData.append("attachments", f));

    try {
      const res = await fetch(`/api/instructors/chat/${courseId}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const msg: Message = await res.json();
      setMessages((prev) => [...prev, msg]);
      setLastFetch(msg.createdAt);
      setText("");
      setFiles([]);
    } catch {
      // toast.error("فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── عرض مرفق ─────────────────────────────────────────────────────────
  const AttachmentPreview = ({ att }: { att: Attachment }) => {
    const isImage = att.mimeType.startsWith("image/");
    const url = `/api/instructors/attachments/${att.storedFilename}`;

    return isImage ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={att.filename}
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover mt-1 border border-border" />
      </a>
    ) : (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-background border border-border hover:border-primary text-xs transition-colors">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate max-w-[150px]">{att.filename}</span>
        <span className="text-muted-foreground shrink-0">{formatSize(att.size)}</span>
        <Download className="w-3 h-3 text-muted-foreground shrink-0" />
      </a>
    );
  };

  return (
    <div className="flex flex-col h-full border border-card-border rounded-xl overflow-hidden bg-card" dir="rtl">
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-semibold">{title}</p>
        </div>
      )}

      {/* الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد رسائل بعد — ابدأ المحادثة!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === sender.id && msg.senderType === sender.type;
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "max-w-[75%] space-y-1",
                  isMine ? "items-start" : "items-end"
                )}>
                  {/* اسم المُرسِل */}
                  <p className={cn(
                    "text-[10px] font-medium px-1",
                    isMine ? "text-primary" : "text-muted-foreground"
                  )}>
                    {isMine ? "أنت" : msg.senderName}
                    {msg.senderType === "instructor" && " 👨‍🏫"}
                  </p>

                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}>
                    {msg.content && <p>{msg.content}</p>}
                    {msg.attachments.map((att) => (
                      <AttachmentPreview key={att.id} att={att} />
                    ))}
                  </div>

                  <p className="text-[10px] text-muted-foreground px-1">
                    {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* معاينة الملفات المختارة */}
      {files.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg text-xs">
              {f.type.startsWith("image/") ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              <span className="max-w-[100px] truncate">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input الإرسال */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          className="hidden"
          onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="إرفاق ملف"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          className="flex-1 h-9"
          dir="rtl"
        />

        <Button
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={sendMessage}
          disabled={sending || (!text.trim() && files.length === 0)}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}