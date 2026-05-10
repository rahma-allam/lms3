import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, BookOpen, Users, CreditCard, Settings,
  GraduationCap, X, ShieldCheck, Tag, Ticket, UserCog, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useListAdminPayments, getListAdminPaymentsQueryKey } from "@workspace/api-client-react";
import { useAdminAuth } from "@/lib/adminAuth";

function getTenantParam(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("tenant");
  if (fromUrl) { localStorage.setItem("tenant_slug", fromUrl); return `?tenant=${fromUrl}`; }
  const s = localStorage.getItem("tenant_slug") ?? "";
  return s ? `?tenant=${s}` : "";
}

const navItems = [
  { key: "dashboard",     icon: LayoutDashboard, href: "/" },
  { key: "courses",       icon: BookOpen,        href: "/courses" },
  { key: "categories",    icon: Tag,             href: "/categories" },
  { key: "students",      icon: Users,           href: "/students" },
  { key: "instructors",   icon: UserCog,         href: "/instructors" },
  { key: "payments",      icon: CreditCard,      href: "/payments" },
  { key: "adminPayments", icon: ShieldCheck,     href: "/admin/payments" },
  { key: "coupons",       icon: Ticket,          href: "/coupons" },
  { key: "settings",      icon: Settings,        href: "/settings" },
];

interface SidebarProps { open: boolean; onClose: () => void; }

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useI18n();
  const [location] = useLocation();
  const { admin, logout } = useAdminAuth();

  // ✅ storefront/settings بدل /api/settings
  const { data: settings } = useQuery({
    queryKey: ["/api/storefront/settings"],
    queryFn: () => fetch(`/api/storefront/settings${getTenantParam()}`).then(r => r.json()),
    staleTime: 60_000,
  });

  const { data: pendingPayments } = useListAdminPayments(
    { status: "pending" },
    { query: { queryKey: getListAdminPaymentsQueryKey({ status: "pending" }), refetchInterval: 15_000 } }
  );

  const pendingCount = pendingPayments?.length ?? 0;
  const academyName = settings?.academyName || "EduAcademy Pro";
  const tenantParam = getTenantParam();

  const handleLogout = () => {
    logout();
    const tenant = localStorage.getItem("tenant_slug");
    window.location.href = tenant ? `/login?tenant=${tenant}` : "/login";
  };

  return (
    <>
     {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />}
<aside className={cn(
  "fixed lg:static top-0 bottom-0 z-30 w-64 bg-sidebar border-e border-sidebar-border flex flex-col transition-transform duration-200",
  // ✅ RTL: يمين — LTR: شمال
  "rtl:right-0 ltr:left-0",
  open 
    ? "translate-x-0" 
    : "rtl:translate-x-full lg:rtl:translate-x-0 ltr:-translate-x-full lg:ltr:translate-x-0"
)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-2 min-w-0">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-bold text-sidebar-foreground text-sm tracking-tight truncate">{academyName}</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ key, icon: Icon, href }) => {
            const isActive = href === "/" ? location === href : location.startsWith(href);
            const badge = key === "adminPayments" && pendingCount > 0 ? pendingCount : null;
            return (
              <Link
                key={key}
                href={`${href}${tenantParam}`}  // ✅ tenant في كل لينك
                onClick={onClose}
                className={cn("sidebar-nav-item", isActive && "active")}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{t(key)}</span>
                {badge !== null && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-sidebar-primary text-sm font-semibold shrink-0">
              {admin?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{admin?.name ?? "Admin"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{admin?.email ?? ""}</p>
            </div>
            <button onClick={handleLogout} className="text-sidebar-foreground/40 hover:text-destructive transition-colors shrink-0" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}