import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { usePixelTracking } from "@/hooks/use-pixel-tracking";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, PlayCircle, Radio, ShoppingCart, Inbox, Star, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";


function getTenantParam(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("tenant");
  if (fromUrl) { localStorage.setItem("tenant_slug", fromUrl); return `?tenant=${fromUrl}`; }
  const s = localStorage.getItem("tenant_slug") ?? "";
  return s ? `?tenant=${s}` : "";
}

export default function Courses() {
  const { t, lang } = useI18n();
  const { trackViewContent } = usePixelTracking();
  const [, navigate] = useLocation();
  const [activeCat, setActiveCat] = useState<number | null>(null);

const { data: courses, isLoading } = useQuery<any[]>({
  queryKey: ["/api/storefront/courses"],
  queryFn: () => fetch(`/api/storefront/courses${getTenantParam()}`).then((r) => r.json()),
  staleTime: 60_000,
});

const { data: categories } = useQuery<any[]>({
  queryKey: ["/api/storefront/categories"],
  queryFn: () => fetch(`/api/storefront/categories${getTenantParam()}`).then((r) => r.json()),
  staleTime: 60_000,
});
  

 const handleBuyNow = (courseId: number, price: number, title: string) => {
  trackViewContent({ contentId: String(courseId), contentName: title, value: price });
  const tenant = localStorage.getItem("tenant_slug");
  navigate(`/checkout?courseId=${courseId}${tenant ? `&tenant=${tenant}` : ""}`);
};

const handleViewCourse = (courseId: number) => {
  const tenant = localStorage.getItem("tenant_slug");
  navigate(`/course/${courseId}${tenant ? `?tenant=${tenant}` : ""}`);
};
  const safeCourses = Array.isArray(courses) ? courses : [];
  const filtered = activeCat ? safeCourses.filter((c: any) => c.categoryId === activeCat) : safeCourses;

  return (
    <section id="courses" className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        {/* Category filter */}
        {categories && categories.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center mb-10">
            <button
              onClick={() => setActiveCat(null)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                activeCat === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {lang === "ar" ? "الكل" : "All"}
            </button>
            {(Array.isArray(categories) ? categories : []).map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  activeCat === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {lang === "ar" ? (cat.nameAr || cat.name) : cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t("courses.title")}
          </motion.h2>
          <motion.p
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t("courses.subtitle")}
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-6">
                  <Skeleton className="h-6 w-2/3 mb-4" />
                  <Skeleton className="h-4 w-1/3 mb-6" />
                  <div className="flex justify-between items-center mt-6">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* حالة عدم وجود بيانات: بدلاً من ترك الصفحة فاضية، نعرض رسالة احترافية */
          <motion.div 
            className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Inbox className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-muted-foreground">
              {t("courses.noCourses") || "قريباً سيتم إضافة دورات جديدة للأكاديمية"}
            </h3>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((course: any, index: number) => {
              const isLive = course.courseType === "live";
              const isFeatured = course.isFeatured;
              return (
                <motion.div
                  key={course.id}
                  className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onClick={() => handleViewCourse(course.id)}
                >
                  {isFeatured && (
                    <div className="absolute top-3 ltr:left-3 rtl:right-3 z-10 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
                      <Star className="w-3 h-3 fill-white" />
                      {lang === "ar" ? "مميز" : "Featured"}
                    </div>
                  )}
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={lang === "en" ? course.title : (course.titleAr || course.title)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                        {isLive ? <Radio className="w-16 h-16" /> : <PlayCircle className="w-16 h-16" />}
                      </div>
                    )}
                    <div className="absolute top-3 ltr:right-3 rtl:left-3 flex gap-1.5 flex-wrap justify-end">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm", isLive ? "bg-red-500/90 text-white" : "bg-background/90 text-foreground")}>
                        {isLive ? t("courses.live") : t("courses.recorded")}
                      </span>
                    </div>
                    {course.moduleCount > 0 && (
                      <div className="absolute bottom-3 ltr:left-3 rtl:right-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium">
                        {course.moduleCount} {t("courses.modules")}
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    {(course as any).category && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-2">
                        {lang === "ar" ? ((course as any).category.nameAr || (course as any).category.name) : (course as any).category.name}
                      </span>
                    )}
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">
                      {lang === "en" ? course.title : (course.titleAr || course.title)}
                    </h3>

                    <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 shrink-0" />
                        {course.studentCount} {t("courses.students")}
                      </span>
                      {(course as any).totalHours && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 shrink-0" />
                          {(course as any).totalHours}h
                        </span>
                      )}
                      {(course as any).level && (
                        <span className="capitalize text-[11px] bg-muted px-2 py-0.5 rounded-full">
                          {(course as any).level}
                        </span>
                      )}
                    </div>

                    <div
                      className="flex items-center justify-between mt-auto pt-4 border-t border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-2xl font-bold text-primary">${course.price}</div>
                      <Button
                        onClick={() => handleBuyNow(course.id, course.price, course.title)}
                        className="gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {t("courses.buy")}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}