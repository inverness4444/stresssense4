import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { SeatPricingSelector } from "@/components/pricing/SeatPricingSelector";
import { INCLUDED_FEATURES, MIN_SEATS } from "@/config/pricing";

export default async function PricingTeaser() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const includedItems = INCLUDED_FEATURES.map((f) => (isRu ? f.ru : f.en));

  return (
    <section id="pricing" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{isRu ? "Стоимость" : "Pricing"}</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            {isRu ? "Цена за место без сложных тарифов." : "One price per seat, no tiers."}
          </h2>
          <p className="text-lg text-slate-600">
            {isRu ? "Настройте количество мест и получите итоговую стоимость." : "Set seats and get a clear monthly total."}
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SeatPricingSelector
            locale={locale}
            defaultSeats={MIN_SEATS}
            title={isRu ? "Цена за место" : "Price per seat"}
            description={isRu ? "Минимум 10 мест. Месячная оплата." : "Minimum 10 seats. Billed monthly."}
            minSeatsHint={isRu ? "Минимум 10 мест" : "Minimum 10 seats"}
            seatsLabel={isRu ? "Количество мест" : "Seats"}
            totalLabel={isRu ? "Итого" : "Total"}
            perSeatLabel={isRu ? "за место" : "per seat"}
            cta={
              <Link
                href="/signup"
                className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
              >
                {isRu ? "Получить доступ" : "Get started"}
              </Link>
            }
          />
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {isRu ? "Что входит" : "What's included"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {isRu ? "Единый пакет возможностей StressSense." : "Everything you need with StressSense."}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {includedItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          {isRu ? "ИНН 771377620451" : "INN 771377620451"}
        </p>
      </div>
    </section>
  );
}
