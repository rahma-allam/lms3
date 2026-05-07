import { useParams, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useGetCourse, getGetCourseQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, PlayCircle, FileText, Lock, Users, Clock,
  Radio, Calendar, Video, ExternalLink, ShoppingCart,
  ChevronDown, ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { usePixelTracking } from "@/hooks/use-pixel-tracking";

function LessonTypeIcon({ type }: { type: string }) {
  if (type === "video") return <PlayCircle className="w-4 h-4 text-primary shrink-0" />;
  if (type === "pdf") return <FileText className="w-4 h-4 text-amber-500 shrink-0" />;
  return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function SessionCard({ session, lang, t }: { session: any; lang: string; t: (k: string) => string }) {
  const now = new Date();
  const scheduled = new Date(session.scheduledAt);
  const isPast = scheduled < now;
  const isToday = scheduled.toDateString() === now.toDateString();

  const title = lang === "ar" ? (session.titleAr || session.title) : session.title;

  return (
    <motion.div
      className={cn(
        "bg-card border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all",
        isPast ? "border-border opacity-60" : "border-primary/30 hover:border-primary/60 hover:shadow-md"
      )}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white font-bold",
        isPast ? "bg-muted text-muted-foreground" : "bg-primary"
      )}>
        <span className="text-lg leading-none">{scheduled.getDate()}</span>
        <span className="text-[10px] uppercase">
          {scheduled.toLocaleString("default", { month: "short" })}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold leading-tight">{title}</h3>
          {isToday && !isPast && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
              {t("session.today")}
            </span>
          )}
          {isPast && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {t("session.past")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {scheduled.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
              weekday: "short", year: "numeric", month: "short", day: "numeric"
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {scheduled.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
              hour: "2-digit", minute: "2-digit"
            })}
          </span>
          <span className="flex items-center gap-1">
            <Video className="w-3.5 h-3.5" />
            {formatDuration(session.durationMinutes)}
          </span>
        </div>
        {session.zoomPassword && !isPast && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("session.password")}: <span className="font-mono font-semibold text-foreground">{session.zoomPassword}</span>
          </p>
        )}
      </div>

      {session.zoomLink && !isPast && (
        <Button
          size="sm"
          className="gap-2 shrink-0 bg-[#2D8CFF] hover:bg-[#1a7ae0] text-white"
          onClick={() => window.open(session.zoomLink, "_blank")}
        >
          <ExternalLink className="w-4 h-4" />
          {t("session.join")}
        </Button>
      )}
    </motion.div>
  );
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const [, navigate] = useLocation();
  const { trackPurchase: _trackPurchase, trackViewContent, trackInitiateCheckout } = usePixelTracking();
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const { data: course, isLoading } = useGetCourse(parseInt(id || "0"), {
    query: {
      queryKey: getGetCourseQueryKey(parseInt(id || "0")),
      enabled: !!id,
    },
  });

  useEffect(() => {
    if (course) {
      trackViewContent({
        contentId: String(course.id),
        contentName: course.title,
        value: course.price,
      });
    }
  }, [course?.id]);

  const toggleModule = (moduleId: number) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleBuyNow = () => {
    if (course) {
      trackInitiateCheckout({ value: course.price, contentId: String(course.id) });
      navigate(`/checkout?courseId=${course.id}`);
    }
  };

  const courseTitle = lang === "en"
    ? (course?.title ?? "")
    : (course?.titleAr || course?.title || "");

  const isLive = course?.courseType === "live";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 pb-16 max-w-5xl mx-auto px-4 space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </div>
            <div className="h-64 bg-muted animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const sessions = (course as any).sessions ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            >
              <ChevronLeft className={cn("w-4 h-4", lang === "ar" && "rotate-180")} />
              {t("course.back")}
            </button>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full",
                    isLive ? "bg-red-500 text-white" : "bg-primary/15 text-primary"
                  )}>
                    {isLive ? t("courses.live") : t("courses.recorded")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {course.moduleCount} {t("courses.modules")}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{courseTitle}</h1>
                {course.description && (
                  <p className="text-muted-foreground leading-relaxed mb-4">{course.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {course.studentCount} {t("courses.students")}
                  </span>
                  {isLive && sessions.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {sessions.length} {t("course.sessions")}
                    </span>
                  )}
                  {!isLive && course.modules && (
                    <span className="flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4" />
                      {course.modules.reduce((acc: number, m: any) => acc + (m.lessons?.length ?? 0), 0)} {t("course.lessons")}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-72 shrink-0">
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                  <div className="h-40 bg-primary/10 flex items-center justify-center">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={courseTitle} className="w-full h-full object-cover" />
                    ) : (
                      isLive ? <Radio className="w-12 h-12 text-primary/30" /> : <PlayCircle className="w-12 h-12 text-primary/30" />
                    )}
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="text-3xl font-bold text-primary">${course.price}</div>
                    <Button className="w-full gap-2" size="lg" onClick={handleBuyNow}>
                      <ShoppingCart className="w-4 h-4" />
                      {t("courses.buy")}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {t("trust.guarantee")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          {isLive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-xl font-bold">{t("course.schedule")}</h2>
                <span className="text-sm text-muted-foreground">
                  ({sessions.length} {t("course.sessions")})
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{t("course.noSessions")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session: any) => (
                    <SessionCard key={session.id} session={session} lang={lang} t={t} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PlayCircle className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{t("course.curriculum")}</h2>
              </div>

              {videoLoading && (
                <div className="bg-black rounded-2xl aspect-video mb-6 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {!videoLoading && activeVideo && (
                <motion.div
                  className="bg-black rounded-2xl overflow-hidden aspect-video mb-6"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <video
                    key={activeVideo.url}
                    src={activeVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full"
                  />
                </motion.div>
              )}

              {course.modules?.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{t("course.noContent")}</p>
                </div>
              ) : (
                course.modules?.map((module: any, idx: number) => {
                  const isOpen = openModules[module.id] ?? idx === 0;
                  const moduleTitle = lang === "ar" ? (module.titleAr || module.title) : module.title;
                  return (
                    <motion.div
                      key={module.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {idx + 1}
                          </div>
                          <span className="font-semibold ltr:text-left rtl:text-right">{moduleTitle}</span>
                          <span className="text-xs text-muted-foreground">
                            {module.lessons?.length ?? 0} {t("course.lessons")}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0", lang === "ar" && "rotate-180")} />
                        }
                      </button>

                      {isOpen && module.lessons?.length > 0 && (
                        <div className="border-t border-border divide-y divide-border">
                          {module.lessons.map((lesson: any, lessonIdx: number) => {
                            const lessonTitle = lang === "ar" ? (lesson.titleAr || lesson.title) : lesson.title;
                            const isClickable = lesson.type === "video" && lesson.videoUrl;
                            return (
                              <div
                                key={lesson.id}
                                onClick={async () => {
                                if (!isClickable) return;
                                setVideoLoading(true);
                                try {
                                  const res = await fetch(`/api/lessons/${lesson.id}/signed-url`, { method: "POST" });
                                  if (res.ok) {
                                    const { url: streamUrl } = await res.json();
                                    setActiveVideo({ url: streamUrl, title: lessonTitle });
                                  }
                                } finally {
                                  setVideoLoading(false);
                                }
                              }}
                                className={cn(
                                  "flex items-center gap-3 px-5 py-3.5 text-sm transition-colors",
                                  isClickable ? "cursor-pointer hover:bg-accent/30" : "opacity-70"
                                )}
                              >
                                <span className="text-muted-foreground w-5 shrink-0 text-xs">
                                  {lessonIdx + 1}.
                                </span>
                                <LessonTypeIcon type={lesson.type} />
                                <span className="flex-1 ltr:text-left rtl:text-right">{lessonTitle}</span>
                                {lesson.duration && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDuration(lesson.duration)}
                                  </span>
                                )}
                                {!isClickable && (
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookOpen({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}