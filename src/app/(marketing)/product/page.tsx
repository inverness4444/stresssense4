import ProductHero from "./_components/ProductHero";
import SectionStressAnalytics from "./_components/SectionStressAnalytics";
import SectionManagerCockpit from "./_components/SectionManagerCockpit";
import SectionEmployeeExperience from "./_components/SectionEmployeeExperience";
import SectionPeopleCompOnboarding from "./_components/SectionPeopleCompOnboarding";
import SectionAIAutomation from "./_components/SectionAIAutomation";
import HowItWorks from "../_components/HowItWorks";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <ProductHero />
      <SectionStressAnalytics />
      <SectionManagerCockpit />
      <SectionEmployeeExperience />
      <SectionPeopleCompOnboarding />
      <SectionAIAutomation />
      <HowItWorks />
    </div>
  );
}
