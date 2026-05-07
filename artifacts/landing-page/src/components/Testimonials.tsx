import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Testimonials() {
  const { t, lang } = useI18n();

  const testimonials = [
    {
      nameEn: "Ahmed Hassan",
      nameAr: "أحمد حسن",
      quoteEn: "The quality of the courses here is unmatched. I've learned more in 3 months than I did in an entire year at university. The platform is so easy to use.",
      quoteAr: "جودة الكورسات هنا لا مثيل لها. لقد تعلمت في 3 أشهر أكثر مما تعلمته في عام كامل في الجامعة. المنصة سهلة الاستخدام جداً.",
      initials: "AH",
    },
    {
      nameEn: "Sarah Mahmoud",
      nameAr: "سارة محمود",
      quoteEn: "As a working mother, flexibility is key for me. EduAcademy Pro allowed me to study at my own pace with highly professional instructors.",
      quoteAr: "كأم عاملة، المرونة هي مفتاح بالنسبة لي. أتاحت لي إيديو أكاديمي برو الدراسة بالسرعة التي تناسبني مع مدربين محترفين للغاية.",
      initials: "SM",
    },
    {
      nameEn: "Omar Tariq",
      nameAr: "عمر طارق",
      quoteEn: "The payment process is secure, the videos are high definition, and the content is practical. Highly recommended for anyone serious about their career.",
      quoteAr: "عملية الدفع آمنة، الفيديوهات عالية الدقة، والمحتوى عملي. أوصي به بشدة لأي شخص جاد في مسيرته المهنية.",
      initials: "OT",
    },
  ];

  return (
    <section id="testimonials" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {t("testimonials.title")}
          </motion.h2>
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t("testimonials.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-card p-8 rounded-2xl shadow-sm border border-border flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <div className="flex items-center gap-1 mb-6 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed flex-1 mb-8 italic">
                "{lang === 'en' ? testimonial.quoteEn : testimonial.quoteAr}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-foreground">
                    {lang === 'en' ? testimonial.nameEn : testimonial.nameAr}
                  </h4>
                  <p className="text-sm text-muted-foreground">Student</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
