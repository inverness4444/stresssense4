import Link from "next/link";

const plans = [
  { name: "Free", price: "0$", desc: "До 20 человек, базовые пульсы и AI-summary", cta: "Попробовать" },
  { name: "Starter", price: "99$/мес", desc: "До 50 людей, AI, Slack/Teams, 2 киоска", cta: "Смотреть тариф" },
  { name: "Growth", price: "299$/мес", desc: "До 200 людей, полный AI, API, automation", cta: "Смотреть тариф" },
  { name: "Scale", price: "899$/мес", desc: "До 500+, HRIS, SSO, кастомные домены", cta: "Связаться с нами" },
];

export default function PricingTeaser() {
  return (
    <section id="pricing" className="bg-slate-50 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Простое ценообразование, которое растёт с вами</h2>
          <p className="mt-3 text-base text-slate-600">Free для старта. Growth и Enterprise — когда нужно покрыть всю организацию.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{plan.price}</p>
              <p className="mt-2 text-sm text-slate-600">{plan.desc}</p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px]"
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">Полные детали тарифов и лимитов — на странице Pricing.</p>
      </div>
    </section>
  );
}
