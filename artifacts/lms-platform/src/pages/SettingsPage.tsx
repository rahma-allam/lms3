import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Settings, Megaphone, Globe, KeyRound, ChevronDown, ChevronUp, Building2 } from "lucide-react";

interface SettingsForm {
  academyName: string;
  academyNameAr: string;
  logoUrl: string;
  metaPixelId: string;
  metaConversionToken: string;
  googleTagId: string;
  googleApiSecret: string;
  tiktokPixelId: string;
  tiktokAccessToken: string;
  defaultLanguage: "en" | "ar";
  currency: string;
}

function PixelSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast.success("Settings saved");
      },
      onError: () => toast.error("Failed to save settings"),
    },
  });

  const { register, handleSubmit, reset } = useForm<SettingsForm>();

  useEffect(() => {
    if (settings) {
      reset({
        academyName: settings.academyName,
        academyNameAr: settings.academyNameAr ?? "",
        logoUrl: settings.logoUrl ?? "",
        metaPixelId: settings.metaPixelId ?? "",
        metaConversionToken: settings.metaConversionToken ?? "",
        googleTagId: settings.googleTagId ?? "",
        googleApiSecret: settings.googleApiSecret ?? "",
        tiktokPixelId: settings.tiktokPixelId ?? "",
        tiktokAccessToken: settings.tiktokAccessToken ?? "",
        defaultLanguage: settings.defaultLanguage,
        currency: settings.currency,
      });
    }
  }, [settings, reset]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-card border border-card-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">{t("settings")}</h1>

      <form
        onSubmit={handleSubmit((data) =>
          updateSettings.mutate({
            data: {
              academyName: data.academyName,
              academyNameAr: data.academyNameAr || undefined,
              logoUrl: data.logoUrl || undefined,
              metaPixelId: data.metaPixelId || undefined,
              metaConversionToken: data.metaConversionToken || undefined,
              googleTagId: data.googleTagId || undefined,
              googleApiSecret: data.googleApiSecret || undefined,
              tiktokPixelId: data.tiktokPixelId || undefined,
              tiktokAccessToken: data.tiktokAccessToken || undefined,
              defaultLanguage: data.defaultLanguage,
              currency: data.currency,
            },
          })
        )}
        className="space-y-6"
      >
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("generalSettings")}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t("academyName")} *</label>
              <Input {...register("academyName", { required: true })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("academyNameAr")}</label>
              <Input {...register("academyNameAr")} className="mt-1" dir="rtl" placeholder="اسم الأكاديمية" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{t("logoUrl")}</label>
            <Input {...register("logoUrl")} className="mt-1" placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t("defaultLanguage")}</label>
              <select
                {...register("defaultLanguage")}
                className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("currency")}</label>
              <select
                {...register("currency")}
                className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="SAR">SAR (ر.س)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="EGP">EGP (ج.م)</option>
                <option value="KWD">KWD (د.ك)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("marketingPixels")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{t("pixelsDesc")}</p>

          <div className="space-y-4 pt-1">
            <PixelSection
              icon={
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">f</span>
                </div>
              }
              title="Meta (Facebook) Pixel"
            >
              <FieldRow
                label="Pixel ID"
                hint="Fires PageView on every page and Purchase on successful payments (browser-side)."
              >
                <Input
                  {...register("metaPixelId")}
                  placeholder="e.g. 1234567890123456"
                  className="font-mono text-xs"
                />
              </FieldRow>
              <FieldRow
                label="Conversions API Access Token"
                hint="Server-side Purchase event via Conversions API — reaches users blocked by ad blockers."
              >
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    {...register("metaConversionToken")}
                    type="password"
                    placeholder="EAAxxxxxxxxxxxxxxxx..."
                    className="font-mono text-xs pl-8"
                  />
                </div>
              </FieldRow>
            </PixelSection>

            <PixelSection
              icon={
                <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-white" />
                </div>
              }
              title="Google Tag / Google Analytics"
            >
              <FieldRow
                label="Tag ID"
                hint="Use GTM-XXXXXXX for Google Tag Manager, or G-XXXXXXXXXX for GA4. Fires page_view on every navigation and purchase on payments."
              >
                <Input
                  {...register("googleTagId")}
                  placeholder="GTM-XXXXXXX  or  G-XXXXXXXXXX"
                  className="font-mono text-xs"
                />
              </FieldRow>
              <FieldRow
                label="GA4 Measurement Protocol API Secret"
                hint="Required for server-side purchase events via Measurement Protocol. Get it in GA4 → Admin → Data Streams → Measurement Protocol API secrets."
              >
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    {...register("googleApiSecret")}
                    type="password"
                    placeholder="api_secret value"
                    className="font-mono text-xs pl-8"
                  />
                </div>
              </FieldRow>
            </PixelSection>

            <PixelSection
              icon={
                <div className="w-6 h-6 rounded bg-black flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">T</span>
                </div>
              }
              title="TikTok Pixel"
            >
              <FieldRow
                label="Pixel ID"
                hint="Fires PageView on every page and CompletePayment on successful payments (browser-side)."
              >
                <Input
                  {...register("tiktokPixelId")}
                  placeholder="Enter your TikTok Pixel ID"
                  className="font-mono text-xs"
                />
              </FieldRow>
              <FieldRow
                label="Events API Access Token"
                hint="Server-side CompletePayment event via TikTok Events API — improves match rate significantly."
              >
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    {...register("tiktokAccessToken")}
                    type="password"
                    placeholder="TikTok Events API access token"
                    className="font-mono text-xs pl-8"
                  />
                </div>
              </FieldRow>
            </PixelSection>
          </div>
        </div>

        <AcademyProfileSection />

        <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? t("loading") : t("saveSettings")}
        </Button>
      </form>
    </div>
  );
}

function AcademyProfileSection() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/academy-profile")
      .then((r) => r.ok ? r.json() : {})
      .then((data) => setProfile(data ?? {}))
      .catch(() => {});
  }, []);

  const handleChange = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/academy-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const textFields: { key: string; label: string; dir?: "rtl" }[] = [
    { key: "heroTitleEn", label: t("heroTitle") },
    { key: "heroTitleAr", label: t("heroTitleAr"), dir: "rtl" },
    { key: "heroSubtitleEn", label: t("heroSubtitle") },
    { key: "heroSubtitleAr", label: t("heroSubtitleAr"), dir: "rtl" },
    { key: "heroCtaEn", label: t("heroCta") },
    { key: "heroCtaAr", label: t("heroCtaAr"), dir: "rtl" },
    { key: "aboutEn", label: t("aboutEn") },
    { key: "aboutAr", label: t("aboutAr"), dir: "rtl" },
    { key: "address", label: t("address") },
    { key: "addressAr", label: t("addressAr"), dir: "rtl" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "whatsapp", label: t("whatsapp") },
    { key: "facebookUrl", label: t("facebookUrl") },
    { key: "instagramUrl", label: t("instagramUrl") },
    { key: "youtubeUrl", label: t("youtubeUrl") },
    { key: "twitterUrl", label: t("twitterUrl") },
  ];

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("academyProfile")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{t("academyProfileDesc")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {textFields.map(({ key, label, dir }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
            <Input
              value={profile[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              dir={dir}
              placeholder={label}
              className="text-sm"
            />
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
        {saved ? "✓ Saved" : saving ? t("loading") : t("saveSettings")}
      </Button>
    </div>
  );
}
