import ProductHero from "./product/_components/ProductHero";
import SectionStressAnalytics from "./product/_components/SectionStressAnalytics";
import SectionManagerCockpit from "./product/_components/SectionManagerCockpit";
import SectionEmployeeExperience from "./product/_components/SectionEmployeeExperience";
import SectionPeopleCompOnboarding from "./product/_components/SectionPeopleCompOnboarding";
import SectionAIAutomation from "./product/_components/SectionAIAutomation";
import SectionSecurityTrust from "./product/_components/SectionSecurityTrust";
import SectionIntegrations from "./product/_components/SectionIntegrations";
import SectionCTA from "./product/_components/SectionCTA";
import LiveDemoSection from "./_components/LiveDemoSection";
import PricingTeaser from "./_components/PricingTeaser";
import SecuritySection from "./_components/SecuritySection";
import MarketingFooter from "./_components/MarketingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      <ProductHero />
      <SectionStressAnalytics />
      <SectionManagerCockpit />
      <SectionEmployeeExperience />
      <SectionPeopleCompOnboarding />
      <SectionAIAutomation />
      <SectionSecurityTrust />
      <SectionIntegrations />
      <SectionCTA />
      <LiveDemoSection />
      <PricingTeaser />
      <SecuritySection />
      <MarketingFooter />
    </div>
  );
}
