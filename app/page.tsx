import FooterSection from "@/components/homepage/footer";
import HeroSection from "@/components/homepage/hero-section";
import Integrations from "@/components/homepage/integrations";
import StepsSection from "@/components/homepage/steps";
import AnimatedBeamDemo from "@/components/ab-block";
import FAQ from "@/components/homepage/faq";
import MyCarousel from "@/components/mycarouesel";
import CTA from "@/components/homepage/cta";
import WhyChooseUs from "@/components/homepage/why-choose-us" 

export default function Home() {
  return (
    <>
      <HeroSection />
      <AnimatedBeamDemo />
      <Integrations />
      <WhyChooseUs />
  
      <MyCarousel />
      <StepsSection />
      <CTA />
      <FAQ />
      <FooterSection />
    </>
  );
}
