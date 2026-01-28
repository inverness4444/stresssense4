import Header from "@/components/Header";
import { getLocale } from "@/lib/i18n-server";
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <>
      <Header locale={locale} />
      <main className="pt-0">{children}</main>
    </>
  );
}
