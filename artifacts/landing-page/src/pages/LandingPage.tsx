import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Courses from "@/components/Courses";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import TrustBadges from "@/components/TrustBadges";
import Footer from "@/components/Footer";
import { usePixelTracking } from "@/hooks/use-pixel-tracking";
import { useQuery } from "@tanstack/react-query";
import NotFound from "./not-found";

export default function LandingPage() {
  usePixelTracking();

  const { data, isError, isLoading } = useQuery({
    queryKey: ["/api/storefront/settings"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/settings");
      if (!res.ok) throw new Error("Academy not found"); // ← ده المهم
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) return null; // أو spinner لو حاببة

  if (isError) return <NotFound />;

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Courses />
        <HowItWorks />
        <Testimonials />
        <TrustBadges />
      </main>
      <Footer />
    </div>
  );
}