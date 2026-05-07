import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, CheckCircle2, XCircle, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function CertificatePage() {
  const { t, lang } = useI18n();
  const [certNumber, setCertNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certNumber.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(certNumber.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20 container mx-auto px-4 max-w-2xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {lang === "ar" ? "التحقق من شهادة الإتمام" : "Certificate Verification"}
          </h1>
          <p className="text-muted-foreground">
            {lang === "ar"
              ? "أدخل رقم الشهادة للتحقق من صحتها"
              : "Enter the certificate number to verify its authenticity"}
          </p>
        </motion.div>

        <motion.div className="bg-card border border-card-border rounded-2xl p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleVerify} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="CERT-2025-123456"
                className="pl-9 font-mono"
              />
            </div>
            <Button type="submit" disabled={loading || !certNumber.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === "ar" ? "تحقق" : "Verify")}
            </Button>
          </form>

          {result && (
            <motion.div
              className={`mt-6 rounded-xl p-5 flex gap-4 items-start ${result.valid ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {result.valid
                ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                : <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              }
              <div>
                {result.valid ? (
                  <>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                      {lang === "ar" ? "شهادة صحيحة ✓" : "Valid Certificate ✓"}
                    </p>
                    <div className="mt-3 space-y-1.5">
                      <p className="text-sm"><span className="text-muted-foreground">{lang === "ar" ? "الطالب:" : "Student:"}</span> <span className="font-medium">{result.studentName}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">{lang === "ar" ? "الدورة:" : "Course:"}</span> <span className="font-medium">{lang === "ar" && result.courseTitleAr ? result.courseTitleAr : result.courseTitle}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">{lang === "ar" ? "رقم الشهادة:" : "Certificate #:"}</span> <span className="font-mono font-medium">{result.certificateNumber}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">{lang === "ar" ? "تاريخ الإصدار:" : "Issued:"}</span> <span className="font-medium">{new Date(result.issuedAt).toLocaleDateString()}</span></p>
                    </div>
                  </>
                ) : (
                  <p className="font-bold text-red-700 dark:text-red-400">
                    {lang === "ar" ? "الشهادة غير موجودة أو غير صحيحة" : "Certificate not found or invalid"}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
