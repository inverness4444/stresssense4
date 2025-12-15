import Link from "next/link";
import { EngagementTrendCard, TrendPoint } from "@/components/EngagementTrendCard";

const metricBadges = [
  { label: "-27% стресс", hint: "в пилотных командах" },
  { label: "+18 п.п.", hint: "рост вовлечённости" },
  { label: "2 недели", hint: "до первого результата" },
];

const heroTrend: TrendPoint[] = [
  { label: "Mar", value: 7.4 },
  { label: "Apr", value: 7.8 },
  { label: "May", value: 8.0 },
  { label: "Jun", value: 8.1 },
  { label: "Jul", value: 8.3 },
  { label: "Aug", value: 8.4 },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100/70 via-white to-emerald-50/70" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm ring-1 ring-primary/10">
            Stress intelligence platform
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Видите стресс команд.
            <br />
            Действуйте вовремя. Растите уверенно.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            StressSense соединяет опросы, AI-коуча, People-модули и автоматизацию, чтобы HR и менеджеры снижали стресс и поднимали вовлечённость.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:translate-y-[-2px]">
              Начать бесплатный trial
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
            >
              Посмотреть продукт
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Без карты · данные только у вас</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {metricBadges.map((item) => (
              <div key={item.label} className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
                <span className="text-primary">{item.label}</span> · {item.hint}
              </div>
            ))}
          </div>
        </div>
        <div className="relative w-full max-w-xl flex-1">
          <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-24 h-24 w-24 rounded-full bg-emerald-200/40 blur-3xl" />
          <EngagementTrendCard
            scope="team"
            title="Отчёт по вовлечённости"
            score={8.4}
            delta={0.6}
            trendLabel="за последние 6 месяцев"
            participation={75}
            data={heroTrend}
          />
        </div>
      </div>
    </section>
  );
}
