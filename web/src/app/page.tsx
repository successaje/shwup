import { Faq, FinalCta, Footer, Hero, HowItWorks, LandingNav, NoShowMath, Problem, WhyArc } from "@/components/landing/sections";

export default function Landing() {
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <NoShowMath />
        <WhyArc />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
