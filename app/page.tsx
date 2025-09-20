import FooterSection from "@/components/homepage/footer";
import HeroSection from "@/components/homepage/hero-section";
import Integrations from "@/components/homepage/integrations";
import StepsSection from "@/components/homepage/steps";
import AnimatedBeamDemo from "@/components/ab-block";
import FAQ from "@/components/homepage/faq";
import MyCarousel from "@/components/mycarouesel";
import CTA from "@/components/homepage/cta";

export default function Home() {
  return (
    <>
      <HeroSection />
      <AnimatedBeamDemo />
      <Integrations />
      <StepsSection />
      <MyCarousel />
      <FAQ />
      <CTA />
      <FooterSection />
    </>
  );
}
