import { getLocale } from "@/lib/i18n-server";
import HeroTrendChart from "../product/_components/HeroTrendChart";

export default async function DemoTrendChartSection() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const demoTrend = isRu
    ? [
        { label: "Мар", value: 6.8 },
        { label: "Апр", value: 7.0 },
        { label: "Май", value: 7.1 },
        { label: "Июн", value: 7.4 },
        { label: "Июл", value: 7.3 },
        { label: "Авг", value: 7.6 },
      ]
    : [
        { label: "Mar", value: 6.8 },
        { label: "Apr", value: 7.0 },
        { label: "May", value: 7.1 },
        { label: "Jun", value: 7.4 },
        { label: "Jul", value: 7.3 },
        { label: "Aug", value: 7.6 },
      ];

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <HeroTrendChart data={demoTrend} className="h-64 w-full" />
        </div>
      </div>
    </section>
  );
}
