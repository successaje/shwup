import { LiveStats } from "@/components/landing/live-stats";
import { Faq, FinalCta, Footer, Hero, HowItWorks, LandingNav, NoShowMath, Problem, Uses, WhyArc } from "@/components/landing/sections";

/** Live numbers come from the chain; regenerate the page at most once a minute. */
export const revalidate = 60;

export default function Landing() {
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <LiveStats />
        <Problem />
        <HowItWorks />
        <Uses />
        <NoShowMath />
        <WhyArc />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
