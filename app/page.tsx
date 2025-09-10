import FooterSection from "@/components/homepage/footer";
import HeroSection from "@/components/homepage/hero-section";
import Integrations from "@/components/homepage/integrations";
import { getSubscriptionDetails } from "@/lib/subscription";
import StepsSection from "@/components/homepage/steps";
import AnimatedBeamDemo from "@/components/ab-block";

export default async function Home() {
  const subscriptionDetails = await getSubscriptionDetails();

  return (
    <>
      <HeroSection />
      <AnimatedBeamDemo />
      <Integrations />
      <StepsSection />
      <FooterSection />
    </>
  );
}
