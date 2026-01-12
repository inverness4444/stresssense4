import { getLocale } from "@/lib/i18n-server";
import ProductHero from "./product/_components/ProductHero";
import InsightStepsSection from "./_components/InsightStepsSection";
import InsightQuoteSection from "./_components/InsightQuoteSection";
import LiveDemoSection from "./_components/LiveDemoSection";
import PricingTeaser from "./_components/PricingTeaser";
import TermsSection from "./_components/TermsSection";
import MarketingFooter from "./_components/MarketingFooter";

export default async function LandingPage() {
  const locale = await getLocale();
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white text-slate-900">
      <ProductHero />
      <InsightStepsSection />
      <InsightQuoteSection />
      <LiveDemoSection locale={locale} />
      <PricingTeaser />
      <TermsSection />
      <MarketingFooter />
    </div>
  );
}
