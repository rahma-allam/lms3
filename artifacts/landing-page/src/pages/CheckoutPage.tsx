import { useLocation, useSearch } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useGetCourse, getGetCourseQueryKey, useCreatePayment } from "@workspace/api-client-react";
import { usePixelTracking } from "@/hooks/use-pixel-tracking";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect } from "react";
import {
  Smartphone, Building2,
  ChevronLeft, CheckCircle2, Lock, Users, BookOpen, Upload, X, Loader2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

const PAYMENT_METHODS = [
  { id: "vodafone_cash", label: "Vodafone Cash",   labelAr: "فودافون كاش", color: "bg-red-600",     method: "cash"         as const },
  { id: "bank",         label: "Bank Transfer",    labelAr: "تحويل بنكي",  color: "bg-emerald-600", method: "bank_transfer" as const },
];

export default function CheckoutPage() {
  const { t, lang } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const { trackPurchase } = usePixelTracking();
  const [, navigate] = useLocation();
  const search = useSearch();
  const courseId = new URLSearchParams(search).get("courseId");

  const [selectedMethod, setSelectedMethod] = useState("vodafone_cash");
  const [step, setStep]                     = useState<"details" | "confirm" | "success">("details");
  const [receiptFile, setReceiptFile]       = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [couponInput, setCouponInput]       = useState("");
  const [couponLoading, setCouponLoading]   = useState(false);
  const [couponData, setCouponData]         = useState<{ code: string; discountAmount: number; discountType: string } | null>(null);
  const [couponError, setCouponError]       = useState<string | null>(null);

  // ─── Redirect لو مش logged in ────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      // نحفظ الـ URL الحالي عشان نرجعه بعد الـ login
      sessionStorage.setItem("redirect_after_login", `/checkout?courseId=${courseId}`);
      navigate("/login");
    }
  }, [authLoading, user, courseId, navigate]);

  // ─── جلب بيانات الكورس ───────────────────────────────────────────────────
  const { data: course, isLoading: courseLoading } = useGetCourse(parseInt(courseId || "0"), {
    query: {
      queryKey: getGetCourseQueryKey(parseInt(courseId || "0")),
      enabled: !!courseId && !!user,
    },
  });

  const courseTitle = lang === "en"
    ? (course?.title ?? "")
    : (course?.titleAr || course?.title || "");

  // ─── Hook إرسال الدفع ────────────────────────────────────────────────────
  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: () => {
        setIsSubmitting(false);
        trackPurchase(finalPrice, "USD");
        setStep("success");
      },
      onError: (err: any) => {
        setError(
          err?.response?.data?.error ||
          (lang === "ar" ? "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً." : "Something went wrong, please try again.")
        );
        setIsSubmitting(false);
      },
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), courseId: courseId ? parseInt(courseId) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || (lang === "ar" ? "كود غير صالح" : "Invalid coupon"));
        setCouponData(null);
      } else {
        setCouponData({ code: data.code, discountAmount: data.discountAmount, discountType: data.discountType });
        setCouponError(null);
      }
    } catch {
      setCouponError(lang === "ar" ? "خطأ في التحقق من الكوبون" : "Coupon validation failed");
    } finally {
      setCouponLoading(false);
    }
  };

  const originalPrice = Number(course?.price ?? 0);
  const discountAmount = couponData
    ? couponData.discountType === "percent"
      ? (originalPrice * couponData.discountAmount) / 100
      : couponData.discountAmount
    : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) {
      setError(lang === "ar" ? "يرجى رفع صورة الإيصال أولاً" : "Please upload the receipt first");
      return;
    }
    setError(null);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!user) { navigate("/login"); return; }

    setIsSubmitting(true);
    setError(null);

    let receiptUrl: string | null = null;
    if (receiptFile) {
      const formData = new FormData();
      formData.append("receipt", receiptFile);
      const uploadRes = await fetch("/api/payments/upload-receipt", { method: "POST", body: formData });
      if (uploadRes.ok) {
        receiptUrl = (await uploadRes.json()).receiptUrl;
      } else {
        const uploadErr = await uploadRes.json().catch(() => ({}));
        setError(uploadErr.error || (lang === "ar" ? "فشل رفع صورة الإيصال، يرجى المحاولة مجدداً." : "Failed to upload receipt, please try again."));
        setIsSubmitting(false);
        return;
      }
    }

    const methodObj = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
    createPayment.mutate({
      data: {
        studentId:  user.id,
        courseId:   courseId ? parseInt(courseId) : undefined,
        amount:     finalPrice,
        status:     "pending",
        method:     methodObj?.method ?? "cash",
        receiptUrl: receiptUrl ?? undefined,
        couponCode: couponData?.code ?? undefined,
        paidAt:     new Date().toISOString(),
      },
    });
  };

  // ─── Loading states ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null; // جاري الـ redirect

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* ─── Success ─────────────────────────────────────────────────── */}
          {step === "success" ? (
            <motion.div
              className="text-center py-20 max-w-lg mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-bold mb-3">{t("checkout.success.title")}</h1>
              <p className="text-muted-foreground mb-2">{t("checkout.success.subtitle")}</p>
              <p className="text-sm text-muted-foreground mb-8">
                {lang === "ar"
                  ? "جاري مراجعة طلبك، سيتم تفعيل الكورس فور التأكد من التحويل."
                  : "Your request is being reviewed. Course will be activated once payment is verified."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate(`/course/${courseId}`)}>
                  {t("checkout.success.go")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  {t("checkout.success.back")}
                </Button>
              </div>
            </motion.div>

          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => step === "confirm" ? setStep("details") : navigate("/")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className={cn("w-5 h-5", lang === "ar" && "rotate-180")} />
                  </button>
                  <h1 className="text-2xl font-bold">
                    {step === "confirm" ? t("checkout.confirm.title") : t("checkout.title")}
                  </h1>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* ─── Step: Details ──────────────────────────────────────── */}
                {step === "details" && (
                  <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {/* بيانات المستخدم (readonly من الـ auth) */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        {t("checkout.personal")}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>{t("checkout.name")}</Label>
                          <Input value={user.name} readOnly className="bg-muted/40 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t("checkout.phone")}</Label>
                          <Input value={user.phone ?? ""} readOnly className="bg-muted/40 cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("checkout.email")}</Label>
                        <Input value={user.email} readOnly className="bg-muted/40 cursor-not-allowed" />
                      </div>
                    </div>

                    {/* كوبون الخصم */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        {lang === "ar" ? "كوبون الخصم" : "Discount Coupon"}
                      </h2>
                      <div className="flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder={lang === "ar" ? "أدخل كود الكوبون" : "Enter coupon code"}
                          className="flex-1 font-mono uppercase"
                          disabled={!!couponData}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                        />
                        {couponData ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => { setCouponData(null); setCouponInput(""); }}>
                            ✕
                          </Button>
                        ) : (
                          <Button type="button" size="sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}>
                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === "ar" ? "تطبيق" : "Apply")}
                          </Button>
                        )}
                      </div>
                      {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                      {couponData && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {lang === "ar" ? `تم تطبيق خصم ${couponData.discountType === "percent" ? `${couponData.discountAmount}%` : `$${couponData.discountAmount}`}` : `Coupon applied — ${couponData.discountType === "percent" ? `${couponData.discountAmount}% off` : `$${couponData.discountAmount} off`}`}
                        </p>
                      )}
                    </div>

                    {/* طريقة الدفع */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        {t("checkout.payment")}
                      </h2>
                      <div className="grid grid-cols-2 gap-3">
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethod(m.id)}
                            className={cn(
                              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
                              selectedMethod === m.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/30"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0", m.color)}>
                              {m.id === "vodafone_cash" && <Smartphone className="w-4 h-4" />}
                              {m.id === "bank"          && <Building2  className="w-4 h-4" />}
                            </div>
                            <span className="text-center leading-tight">
                              {lang === "ar" ? m.labelAr : m.label}
                            </span>
                            {selectedMethod === m.id && (
                              <div className="absolute top-2 ltr:right-2 rtl:left-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedMethod}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 pt-2"
                        >
                          <div className={cn(
                            "rounded-xl p-4 text-sm border",
                            selectedMethod === "vodafone_cash" && "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-300",
                            selectedMethod === "bank"          && "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300"
                          )}>
                            <p className="font-bold mb-1">
                              {selectedMethod === "vodafone_cash" ? t("checkout.vodafone.title") : t("checkout.bank.title")}
                            </p>
                            <p className="opacity-90">
                              {selectedMethod === "vodafone_cash"
                                ? t("checkout.vodafone.desc")
                                : <>{t("checkout.bank.account")}: 1234-5678-9012<br />{t("checkout.bank.name")}: EduAcademy Pro</>
                              }
                            </p>
                          </div>

                          {/* رفع الإيصال */}
                          <div className="space-y-3 p-4 border-2 border-dashed border-muted rounded-2xl bg-muted/20">
                            <Label className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              {lang === "ar" ? "ارفع صورة إيصال التحويل" : "Upload transaction receipt"}
                            </Label>

                            {!previewUrl ? (
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                className="h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/40 transition-colors rounded-xl border border-border bg-background"
                              >
                                <Upload className="w-8 h-8 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground italic">
                                  {lang === "ar" ? "اضغط لاختيار صورة" : "Click to select an image"}
                                </span>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileChange}
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <img src={previewUrl} alt="Receipt" className="w-full h-40 object-contain rounded-xl border bg-black" />
                                <button
                                  type="button"
                                  onClick={removeFile}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <Button type="submit" size="lg" className="w-full gap-2" disabled={!receiptFile}>
                      <Lock className="w-4 h-4" />
                      {t("checkout.proceed")}
                    </Button>
                  </motion.form>
                )}

                {/* ─── Step: Confirm ──────────────────────────────────────── */}
                {step === "confirm" && (
                  <motion.div
                    className="space-y-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                      <h2 className="font-semibold">{t("checkout.summary")}</h2>

                      {/* الكورس */}
                      <div className="flex items-start gap-4 pb-4 border-b border-border">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{courseTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {course?.courseType === "live" ? t("courses.live") : t("courses.recorded")}
                          </p>
                        </div>
                        <p className="font-bold text-xl text-primary shrink-0">
                          {courseLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `$${course?.price ?? "—"}`}
                        </p>
                      </div>

                      {/* بيانات المستخدم */}
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t("checkout.name")}</span>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t("checkout.email")}</span>
                        <span className="font-medium text-foreground">{user.email}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t("checkout.method")}</span>
                        <span className="font-medium text-foreground capitalize">
                          {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.[lang === "ar" ? "labelAr" : "label"]}
                        </span>
                      </div>

                      {/* معاينة الإيصال */}
                      {previewUrl && (
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            {lang === "ar" ? "الإيصال المرفق" : "Attached Receipt"}
                          </p>
                          <img src={previewUrl} alt="Receipt preview" className="w-full max-h-40 object-contain rounded-xl border bg-black" />
                        </div>
                      )}

                      {/* الخصم والإجمالي */}
                      {couponData && discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                          <span>{lang === "ar" ? "خصم الكوبون" : "Coupon discount"}</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                        <span>{t("checkout.total")}</span>
                        <span className="text-primary">
                          {courseLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `$${finalPrice.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={handleConfirm}
                      disabled={isSubmitting || createPayment.isPending || courseLoading}
                    >
                      {(isSubmitting || createPayment.isPending) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {(isSubmitting || createPayment.isPending)
                        ? (lang === "ar" ? "جاري الإرسال..." : "Submitting...")
                        : `${t("checkout.pay")} $${finalPrice.toFixed(2)}`}
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* ─── Course Card (sidebar) ───────────────────────────────── */}
              <div className="lg:col-span-2">
                <div className="sticky top-28 space-y-4">
                  {course ? (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="h-36 bg-primary/10 flex items-center justify-center">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt={courseTitle} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-12 h-12 text-primary/40" />
                        )}
                      </div>
                      <div className="p-5 space-y-3">
                        <h3 className="font-bold text-lg leading-tight">{courseTitle}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{course.studentCount} {t("courses.students")}</span>
                          </div>
                          <span className="text-2xl font-bold text-primary">${course.price}</span>
                        </div>
                      </div>
                    </div>
                  ) : courseLoading ? (
                    <div className="bg-card border border-border rounded-2xl p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}