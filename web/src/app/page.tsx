import { LiveStats } from "@/components/landing/live-stats";
import { Faq, Hero, HowItWorks, NoShowMath, Problem, Uses, WhyArc } from "@/components/landing/sections";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Live numbers come from the chain; regenerate the page at most once a minute. */
export const revalidate = 60;

export default function Landing() {
  return (
    <>
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <LiveStats />
        <Problem />
        <HowItWorks />
        <Uses />
        <NoShowMath />
        <WhyArc />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
