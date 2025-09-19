import FooterSection from "@/components/homepage/footer";
import HeroSection from "@/components/homepage/hero-section";
import Integrations from "@/components/homepage/integrations";
import { getSubscriptionDetails } from "@/lib/subscription";
import StepsSection from "@/components/homepage/steps";
import AnimatedBeamDemo from "@/components/ab-block";
import FAQ from "@/components/homepage/faq";
import MyCarousel from "@/components/mycarouesel";
import CTA from "@/components/homepage/cta";
import PublicPricing from "@/components/homepage/price";

export default async function Home() {
  await getSubscriptionDetails(); // Subscription details are not currently used

  return (
    <>
      <HeroSection />
      <AnimatedBeamDemo />
      <Integrations />
      <StepsSection />
      <MyCarousel />
      
     
      <PublicPricing />
      <FAQ />
      <CTA />
      <FooterSection />
      
    </>
  );
}
