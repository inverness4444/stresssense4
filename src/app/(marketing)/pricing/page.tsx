import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({ orderBy: { monthlyPriceCents: "asc" } });
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">Простые тарифы для роста</h1>
          <p className="mt-2 text-lg text-slate-600">
            Начните бесплатно, а потом выберите план под размер вашей команды.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">{plan.key?.toUpperCase() ?? "PLAN"}</p>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900">${(plan.monthlyPriceCents ?? 0) / 100}</span>
                <span className="text-sm text-slate-500">/ мес</span>
              </div>
              {plan.baseSeats && (
                <p className="text-sm text-slate-600">Включено {plan.baseSeats} мест · +{(plan.pricePerSeatCents ?? 0) / 100}$/seat</p>
              )}
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {plan.featureKeys.slice(0, 6).map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/signup?plan=${plan.key ?? ""}`}
                className="mt-6 block w-full rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01]"
              >
                Начать бесплатный пробный период
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
