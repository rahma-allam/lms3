import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { SiVisa, SiMastercard } from "react-icons/si";

export default function TrustBadges() {
  const { t } = useI18n();

  return (
    <section className="py-16 border-t border-border bg-card">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t("trust.title")}</h3>
              <p className="text-muted-foreground text-sm">{t("trust.guarantee")}</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-300"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-2xl font-bold font-sans">fawry</div>
            <div className="text-xl font-bold font-sans">Vodafone Cash</div>
            <SiVisa className="w-12 h-12" />
            <SiMastercard className="w-10 h-10" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
