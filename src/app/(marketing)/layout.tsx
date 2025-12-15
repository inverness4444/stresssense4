import Header from "@/components/Header";
import { getLocale } from "@/lib/i18n-server";
import { StressSenseAiWidget } from "../../components/StressSenseAiWidget";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <>
      <Header locale={locale} />
      <main className="pt-20 sm:pt-24">{children}</main>
      <StressSenseAiWidget mode="landing" />
    </>
  );
}
