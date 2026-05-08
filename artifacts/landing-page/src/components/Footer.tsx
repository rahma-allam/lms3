import { useI18n } from "@/lib/i18n";
import { Facebook, Twitter, Instagram, Youtube, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchStorefront } from "@/lib/api";

export default function Footer() {
  const { t, lang } = useI18n();

  const { data: settings } = useQuery<any>({
  queryKey: ["/api/storefront/settings"],
  queryFn: () => fetchStorefront("/api/storefront/settings"),
  staleTime: 60_000,
});

  // const settings = settings?.pro || "EduAcademy Pro";
  const academyName = settings?.academyName || "EduAcademy Pro";
  const logoUrl = settings?.logoUrl;

  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              {logoUrl ? (
                <img src={logoUrl} alt={academyName} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl leading-none">
                    {academyName.charAt(0)}
                  </span>
                </div>
              )}
              <span className="font-bold text-xl">{academyName}</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
              {lang === "ar" ? (settings?.aboutAr || t("footer.tagline")) : (settings?.aboutEn || t("footer.tagline"))}
            </p>
            {settings?.address && (
              <p className="text-sm text-muted-foreground mb-4">
                📍 {lang === "ar" ? (settings.addressAr || settings.address) : settings.address}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {(settings?.facebookUrl || true) && (
                <a href={settings?.facebookUrl || "#"} target={settings?.facebookUrl ? "_blank" : undefined} rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {(settings?.twitterUrl || true) && (
                <a href={settings?.twitterUrl || "#"} target={settings?.twitterUrl ? "_blank" : undefined} rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {(settings?.instagramUrl || true) && (
                <a href={settings?.instagramUrl || "#"} target={settings?.instagramUrl ? "_blank" : undefined} rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.youtubeUrl && (
                <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-red-600 hover:text-white transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {settings?.whatsapp && (
                <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-emerald-500 hover:text-white transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-foreground">{lang === "ar" ? "روابط" : "Links"}</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">{t("nav.features")}</a></li>
              <li><a href="#courses" className="text-muted-foreground hover:text-primary transition-colors">{t("nav.courses")}</a></li>
              <li><a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">{t("nav.testimonials")}</a></li>
              <li><a href="/certificate" className="text-muted-foreground hover:text-primary transition-colors">{lang === "ar" ? "تحقق من شهادة" : "Verify Certificate"}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-foreground">{lang === "ar" ? "قانوني" : "Legal"}</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{lang === "ar" ? "شروط الاستخدام" : "Terms of Service"}</a></li>
              {settings?.email && <li><a href={`mailto:${settings.email}`} className="text-muted-foreground hover:text-primary transition-colors">{lang === "ar" ? "تواصل معنا" : "Contact Us"}</a></li>}
              {settings?.phone && <li><a href={`tel:${settings.phone}`} className="text-muted-foreground hover:text-primary transition-colors">{settings.phone}</a></li>}
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} {academyName}. {t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}
