import HeroSection from "./_components/HeroSection";
import SocialProof from "./_components/SocialProof";
import ProductPillars from "./_components/ProductPillars";
import SolutionsSection from "./_components/SolutionsSection";
import HowItWorks from "./_components/HowItWorks";
import ManagerDeepDive from "./_components/ManagerDeepDive";
import EmployeeDeepDive from "./_components/EmployeeDeepDive";
import AIStrip from "./_components/AIStrip";
import IntegrationsSection from "./_components/IntegrationsSection";
import LiveDemoSection from "./_components/LiveDemoSection";
import PricingTeaser from "./_components/PricingTeaser";
import SecuritySection from "./_components/SecuritySection";
import FinalCTA from "./_components/FinalCTA";
import MarketingFooter from "./_components/MarketingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      <HeroSection />
      <SocialProof />
      <ProductPillars />
      <SolutionsSection />
      <HowItWorks />
      <ManagerDeepDive />
      <EmployeeDeepDive />
      <AIStrip />
      <IntegrationsSection />
      <LiveDemoSection />
      <PricingTeaser />
      <SecuritySection />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}
