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
import { fetchStorefront } from "@/lib/api";

export default function LandingPage() {
  usePixelTracking();
const { isError } = useQuery({
  queryKey: ["/api/storefront/settings"],
  queryFn: () => fetchStorefront("/api/storefront/settings"),
  staleTime: 60_000,
  retry: false,  // ← مهم عشان ميعملش 3 retries قبل ما يظهر الـ NotFound
});

if (isError) {
  // لو الـ API رجع 404 → الـ tenant مش موجود
  return <NotFound />;
}else{
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
}
