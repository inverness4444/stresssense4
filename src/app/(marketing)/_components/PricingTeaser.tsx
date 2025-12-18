import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

const plans = [
  {
    key: "free",
    name: { en: "Free", ru: "Free" },
    priceUsd: 0,
    desc: {
      en: "Up to 20 people, pulse surveys and AI summary.",
      ru: "До 20 человек, базовые пульсы и AI-summary.",
    },
    cta: { en: "Start free", ru: "Начать бесплатно" },
  },
  {
    key: "starter",
    name: { en: "Starter", ru: "Starter" },
    priceUsd: 99,
    desc: {
      en: "Up to 50 people, AI, Slack/Teams, 2 kiosks.",
      ru: "До 50 людей, AI, Slack/Teams, 2 киоска.",
    },
    cta: { en: "See plan", ru: "Смотреть тариф" },
  },
  {
    key: "growth",
    name: { en: "Growth", ru: "Growth" },
    priceUsd: 299,
    desc: {
      en: "Up to 200 people, full AI, API, automation.",
      ru: "До 200 людей, полный AI, API, automation.",
    },
    cta: { en: "See plan", ru: "Смотреть тариф" },
  },
  {
    key: "scale",
    name: { en: "Scale", ru: "Scale" },
    priceUsd: 899,
    desc: {
      en: "500+, HRIS, SSO, custom domains.",
      ru: "До 500+, HRIS, SSO, кастомные домены.",
    },
    cta: { en: "Contact us", ru: "Связаться с нами" },
  },
  {
    key: "enterprise-plus",
    name: { en: "Enterprise+", ru: "Enterprise+" },
    priceUsd: 2000,
    desc: {
      en: "2000+ people, full automation, dedicated support.",
      ru: "2000+, полная автоматизация и выделенная поддержка.",
    },
    cta: { en: "Talk to sales", ru: "Связаться с продажами" },
  },
];

export default async function PricingTeaser() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const usdToRub = 100; // 99$ -> 9900 ₽
  const formatPrice = (usd: number) => {
    if (isRu) return `${Math.round(usd * usdToRub).toLocaleString("ru-RU")} ₽`;
    return `$${usd}`;
  };

  return (
    <section id="pricing" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{isRu ? "Тарифы" : "Pricing"}</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            {isRu ? "Простые тарифы, растущие вместе с вами." : "Simple pricing that grows with you."}
          </h2>
          <p className="text-lg text-slate-600">
            {isRu ? "Выберите подходящий план или откройте полный прайсинг." : "Pick a plan or open full pricing details."}
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.key} className="rounded-2xl bg-white p-6 shadow-md shadow-primary/5 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-primary">{plan.name[isRu ? "ru" : "en"]}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {plan.priceUsd === 0 ? (isRu ? "0 ₽" : "$0") : formatPrice(plan.priceUsd)}
                <span className="text-sm font-semibold text-slate-500">{plan.priceUsd === 0 ? "" : isRu ? " / мес" : " / mo"}</span>
              </p>
              <p className="mt-2 text-sm text-slate-600">{plan.desc[isRu ? "ru" : "en"]}</p>
              {plan.key === "enterprise-plus" ? (
                <form
                  action="mailto:sales@stresssense.ai"
                  method="post"
                  encType="text/plain"
                  className="mt-4 space-y-2"
                >
                  <input
                    name="name"
                    required
                    placeholder={isRu ? "Ваше имя" : "Your name"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    name="note"
                    placeholder={isRu ? "Задачи и размер команды" : "Team size and needs"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                  >
                    {isRu ? "Оставить контакты" : "Leave your details"}
                  </button>
                </form>
              ) : (
                <Link
                  href={`/signup?plan=${plan.key}`}
                  className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                >
                  {plan.cta[isRu ? "ru" : "en"]}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
