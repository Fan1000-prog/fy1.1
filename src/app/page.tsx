import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Story } from "@/components/landing/story";
import { PartnersAndCta } from "@/components/landing/cta";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col fy-hero-gradient">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Story />
        <PartnersAndCta />
      </main>
    </div>
  );
}
