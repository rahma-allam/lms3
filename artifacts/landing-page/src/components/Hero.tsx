import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { JoinCourseModal } from "./JoinCourseModal";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Hero() {
  const { t, lang } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

 const { data: profile } = useQuery<any>({
  queryKey: ["/api/storefront/settings"],
  queryFn: () => fetch("/api/storefront/settings").then((r) => r.json()),
  staleTime: 60_000,
});

  const heroTitle = lang === "ar"
    ? (profile?.heroTitleAr || (lang === "ar" ? "اكتشف إمكانياتك الحقيقية" : null))
    : profile?.heroTitleEn;

  const heroSubtitle = lang === "ar"
    ? (profile?.heroSubtitleAr || null)
    : profile?.heroSubtitleEn;

  const heroCta = lang === "ar"
    ? (profile?.heroCtaAr || t("hero.cta.join"))
    : (profile?.heroCtaEn || t("hero.cta.join"));

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              #1 Online Academy in the Region
            </span>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {heroTitle ? (
              <>{heroTitle}</>
            ) : lang === "ar" ? (
              <>اكتشف <span className="text-primary">إمكانياتك الحقيقية</span></>
            ) : (
              <>Unlock Your <span className="text-primary">True Potential</span></>
            )}
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {heroSubtitle || t("hero.subtitle")}
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-full" onClick={() => setIsModalOpen(true)}>
              {heroCta}
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 rounded-full">
              <a href="#courses">{t("hero.cta.explore")}</a>
            </Button>
          </motion.div>
        </div>
      </div>
      <JoinCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} course={null} />
    </section>
  );
}
