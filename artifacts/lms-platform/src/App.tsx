import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { Layout } from "@/components/layout/Layout";
import { usePixels } from "@/hooks/usePixels";
import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuth";
import { TenantProvider } from "@/hooks/useTenant";
import Dashboard from "@/pages/Dashboard";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import Students from "@/pages/Students";
import StudentDetail from "@/pages/StudentDetail";
import Payments from "@/pages/Payments";
import AdminPayments from "@/pages/AdminPayments";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import Instructors from "./pages/Instructors";
import Categories from "./pages/Categories";
import Coupons from "./pages/Coupons";
import AdminLogin from "./pages/AdminLogin";
import { useEffect } from "react";
import { InstructorAuthProvider, useInstructorAuth } from "./lib/instructorAuth";
import InstructorLogin from "./pages/InstructorLogin";
import InstructorDashboard from "./pages/InstructorDashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
function InstructorAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useInstructorAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/instructor/login");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!isAuthenticated) return null;
  return <>{children}</>;
}



function AppRoutes() {
  usePixels();
  return (
    <Switch>
      <Route path="/login" component={AdminLogin} />
      <Route path="/instructor/login" component={InstructorLogin} />
      <Route path="/instructor">
        <InstructorAuthGuard>
          <InstructorDashboard />
        </InstructorAuthGuard>
      </Route>
      <Route>
        <AuthGuard>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/courses" component={Courses} />
              <Route path="/courses/:id" component={CourseDetail} />
              <Route path="/students" component={Students} />
              <Route path="/students/:id" component={StudentDetail} />
              <Route path="/payments" component={Payments} />
              <Route path="/admin/payments" component={AdminPayments} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/instructors" component={Instructors} />
              <Route path="/categories" component={Categories} />
              <Route path="/coupons" component={Coupons} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <TenantProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <InstructorAuthProvider>
              <AdminAuthProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AppRoutes />
                </WouterRouter>
                <Toaster richColors position="top-right" />
              </AdminAuthProvider>
            </InstructorAuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </TenantProvider>
  );
}

export default App;
