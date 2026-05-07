import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { UserPlus, CreditCard, Laptop } from "lucide-react";

export default function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      icon: UserPlus,
      titleKey: "howitworks.step1",
      descKey: "howitworks.step1.desc",
    },
    {
      icon: CreditCard,
      titleKey: "howitworks.step2",
      descKey: "howitworks.step2.desc",
    },
    {
      icon: Laptop,
      titleKey: "howitworks.step3",
      descKey: "howitworks.step3.desc",
    },
  ];

  return (
    <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t("howitworks.title")}
          </motion.h2>
          <motion.p 
            className="text-lg opacity-90"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t("howitworks.subtitle")}
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-primary-foreground/20 -translate-y-1/2"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white text-primary flex items-center justify-center mb-6 relative z-10 shadow-xl">
                  <step.icon className="w-10 h-10" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm border-4 border-primary shadow-sm">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{t(step.titleKey)}</h3>
                <p className="opacity-90">{t(step.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
