import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface TenantTheme {
  academyName: string;
  academyNameAr: string | null;
  logoUrl: string | null;
  defaultLanguage: "en" | "ar";
  currency: string;
  metaPixelId: string | null;
  googleTagId: string | null;
  tiktokPixelId: string | null;
  manualPaymentInstructions: string | null;
}

interface TenantContextValue {
  tenantId: number | null;
  theme: TenantTheme | null;
  isLoading: boolean;
  /** true  = student-facing Storefront
   *  false = Admin / Instructor Panel  */
  isStorefront: boolean;
  hostname: string;
  refetch: () => void;
}

const TenantCtx = createContext<TenantContextValue>({
  tenantId: null,
  theme: null,
  isLoading: true,
  isStorefront: false,
  hostname: "",
  refetch: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [theme, setTheme] = useState<TenantTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStorefront, setIsStorefront] = useState(false);

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "";

  async function loadTenant() {
    setIsLoading(true);
    try {
      const isLocalDev =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.");

      // On localhost, fall back to the dev slug env var
      // const devSlug = import.meta.env.VITE_DEV_TENANT_SLUG || "demo";

      const isAppSubdomain =
        BASE_DOMAIN && hostname === `app.${BASE_DOMAIN}`;

      // Build URL – append slug only in local dev
      // const url = isLocalDev
      //   ? `/api/tenant/theme?slug=${devSlug}`
      //   : "/api/tenant/theme";
      const urlParams = new URLSearchParams(window.location.search);
      const devSlug =
        urlParams.get("tenant") ||
        import.meta.env.VITE_DEV_TENANT_SLUG ||
        "demo";
      const url = isLocalDev
        ? `/api/tenant/theme?slug=${devSlug}`
        : "/api/tenant/theme";

      const res = await fetch(url);
      if (!res.ok) {
        console.warn("Tenant theme not found, using defaults");
        setIsLoading(false);
        return;
      }

      const data: { tenantId: number; theme: TenantTheme } = await res.json();
      setTenantId(data.tenantId);
      setTheme(data.theme);
      // Show storefront unless we're on the app.* subdomain
      setIsStorefront(!isAppSubdomain);
    } catch (e) {
      console.error("Failed to load tenant theme", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TenantCtx.Provider
      value={{
        tenantId,
        theme,
        isLoading,
        isStorefront,
        hostname,
        refetch: loadTenant,
      }}
    >
      {children}
    </TenantCtx.Provider>
  );
}

export function useTenant() {
  return useContext(TenantCtx);
}
