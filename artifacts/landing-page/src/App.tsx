import { I18nProvider } from "./lib/i18n";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter } from "wouter";
import LandingPage from "./pages/LandingPage";
import CheckoutPage from "./pages/CheckoutPage";
import CoursePage from "./pages/CoursePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import StudentPortal from "./pages/StudentPortal";
import CertificatePage from "./pages/CertificatePage";
import NotFound from "./pages/not-found";
import { usePixels } from "./hooks/usePixels";
import { useEffect, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ── Tenant Guard ──────────────────────────────────────────
function TenantGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "notFound">("loading");

  useEffect(() => {
    // احفظ الـ slug من URL في localStorage فوراً
    const fromUrl = new URLSearchParams(window.location.search).get("tenant");
    if (fromUrl) localStorage.setItem("tenant_slug", fromUrl);

    const slug = fromUrl ?? localStorage.getItem("tenant_slug");

    if (!slug) {
      setStatus("notFound");
      return;
    }

    fetch(`/api/storefront/settings?tenant=${slug}`)
      .then((res) => {
        if (res.ok) setStatus("ok");
        else setStatus("notFound");
      })
      .catch(() => setStatus("notFound"));
  }, []);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (status === "notFound") return <NotFound />;

  return <>{children}</>;
}

// ── Routes ────────────────────────────────────────────────
function Routes() {
  usePixels();
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/course/:id" component={CoursePage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/portal" component={StudentPortal} />
      <Route path="/certificate" component={CertificatePage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

// ── App ───────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <TenantGuard>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Routes />
              </WouterRouter>
            </TenantGuard>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;