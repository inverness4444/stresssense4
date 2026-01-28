import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import HeroTrendChart from "./HeroTrendChart";

type Metric = {
  title: string;
  value: number;
  delta: number;
  state: "positive" | "neutral" | "warning";
  highlight?: boolean;
};

const STRESS_COLORS = {
  low: "#22c55e",
  mid: "#f59e0b",
  high: "#ef4444",
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const interpolateColor = (startHex: string, endHex: string, t: number) => {
  const normalize = (hex: string) => {
    const value = hex.replace("#", "");
    const num = parseInt(value, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };
  const start = normalize(startHex);
  const end = normalize(endHex);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(start.r, end.r))}${toHex(mix(start.g, end.g))}${toHex(mix(start.b, end.b))}`;
};

const stressArcColor = (progress: number) => {
  const value = clamp01(progress);
  if (value <= 0.5) return interpolateColor(STRESS_COLORS.low, STRESS_COLORS.mid, value / 0.5);
  return interpolateColor(STRESS_COLORS.mid, STRESS_COLORS.high, (value - 0.5) / 0.5);
};

export default async function ProductHero() {
  const locale = await getLocale();
  const isRu = locale === "ru";

  const focusMetrics: Metric[] = isRu
    ? [
        { title: "Признание", value: 5.4, delta: -1.1, state: "warning", highlight: true },
        { title: "Ясность", value: 6.6, delta: 1.1, state: "neutral" },
        { title: "Нагрузка", value: 6.8, delta: 0.4, state: "neutral" },
      ]
    : [
        { title: "Recognition", value: 5.4, delta: -1.1, state: "warning", highlight: true },
        { title: "Clarity", value: 6.6, delta: 1.1, state: "neutral" },
        { title: "Workload", value: 6.8, delta: 0.4, state: "neutral" },
      ];

  const thrivingMetrics: Metric[] = isRu
    ? [
        { title: "Вовлечённость", value: 9.1, delta: 0.8, state: "positive" },
        { title: "Обратная связь", value: 7.3, delta: 0.8, state: "positive" },
        { title: "Благополучие", value: 9.4, delta: 0.9, state: "positive" },
      ]
    : [
        { title: "Alignment", value: 9.1, delta: 0.8, state: "positive" },
        { title: "Feedback", value: 7.3, delta: 0.8, state: "positive" },
        { title: "Wellness", value: 9.4, delta: 0.9, state: "positive" },
      ];

  const score = 8.2;
  const participation = 75;
  const donutRadius = 52;
  const donutStroke = 12;
  const donutProgressRaw = clamp01(score / 10);
  const donutProgress = donutProgressRaw === 1 ? 0.9999 : donutProgressRaw;
  const center = 90;
  const polarToCartesian = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: center + donutRadius * Math.cos(rad), y: center + donutRadius * Math.sin(rad) };
  };
  const start = polarToCartesian(0);
  const end = polarToCartesian(donutProgress * 360);
  const largeArc = donutProgress > 0.5 ? 1 : 0;
  const donutArc = `M ${start.x} ${start.y} A ${donutRadius} ${donutRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  const donutEndColor = stressArcColor(donutProgressRaw);
  const trendDelta = 1.4;
  const trendIsUp = trendDelta >= 0;
  const trendLabel = isRu
    ? `${trendIsUp ? "↑" : "↓"} ${Math.abs(trendDelta).toFixed(1)} пт за 6 мес.`
    : `${trendIsUp ? "↑" : "↓"} ${Math.abs(trendDelta).toFixed(1)} pt in the last 6 months`;

  const stressState =
    score >= 7
      ? {
          label: isRu ? "Требует внимания" : "Needs attention",
          gradientStart: "#f97316",
          gradientEnd: "#ef4444",
          statusColor: "text-rose-600",
        }
      : score >= 4
        ? {
            label: isRu ? "Мониторинг" : "Monitor",
            gradientStart: "#fbbf24",
            gradientEnd: "#f97316",
            statusColor: "text-amber-600",
          }
        : {
            label: isRu ? "Спокойно" : "Low stress",
            gradientStart: "#22c55e",
            gradientEnd: "#0ea5e9",
            statusColor: "text-emerald-600",
          };

  const trendData = isRu
    ? [
        { label: "1 янв.", value: 6.2 },
        { label: "3 янв.", value: 6.5 },
        { label: "5 янв.", value: 6.3 },
        { label: "7 янв.", value: 6.9 },
        { label: "9 янв.", value: 7.1 },
        { label: "11 янв.", value: 7.4 },
      ]
    : [
        { label: "Jan 1", value: 6.2 },
        { label: "Jan 3", value: 6.5 },
        { label: "Jan 5", value: 6.3 },
        { label: "Jan 7", value: 6.9 },
        { label: "Jan 9", value: 7.1 },
        { label: "Jan 11", value: 7.4 },
      ];

  const formatDelta = (delta: number) => {
    const arrow = delta >= 0 ? "↑" : "↓";
    const suffix = isRu ? "пт" : "pt";
    return `${arrow} ${Math.abs(delta).toFixed(1)} ${suffix}`;
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white pb-16 pt-16 sm:pb-24 sm:pt-20" id="product">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-indigo-50" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm ring-1 ring-primary/10">
            {isRu ? "StressSense" : "StressSense"}
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-5xl">
            {isRu ? (
              <>
                Вы не решите проблемы, если{" "}
                <span className="italic text-primary-strong">не замечаете стресс вовремя</span>
              </>
            ) : (
              <>
                You can&apos;t fix issues if you&apos;re{" "}
                <span className="italic text-primary-strong">not paying attention</span>
              </>
            )}
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            {isRu
              ? "StressSense показывает ранние сигналы стресса и вовлечённости, чтобы вы принимали решения раньше и защищали команду от выгорания."
              : "StressSense surfaces early stress and engagement signals so you can act sooner and protect teams from burnout."}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            {(isRu
              ? ["Пульс-опросы за 30 секунд", "Агрегаты по командам", "Индивидуальный отчёт сотрудника"]
              : ["30-sec daily pulses", "Team-level aggregates", "Personal employee reports"]
            ).map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">
                {item}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5"
            >
              {isRu ? "Получить доступ" : "Get access"}
            </Link>
            <a
              href="#demo"
              className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
            >
              {isRu ? "Живое демо" : "Live demo"}
            </a>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isRu ? "Результаты только в агрегатах · без личных данных" : "Aggregated only · no personal data"}
          </p>
        </div>

        <div className="relative w-full flex-1">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -left-12 top-10 h-28 w-28 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="relative w-full max-w-[680px] rounded-[34px] bg-white/95 p-6 shadow-2xl shadow-indigo-100 ring-1 ring-slate-200 sm:ml-auto sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{isRu ? "Отчёт по опросу" : "Survey report"}</p>
                <p className="text-xs font-semibold text-slate-500">{isRu ? "Стресс и вовлечённость" : "Stress & engagement"}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {isRu ? `Участие ${participation}%` : `${participation}% participation`}
                </div>
                <a className="text-primary hover:text-primary-strong hover:underline" href="#demo">
                  {isRu ? "Смотреть" : "View"}
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[180px_1fr] lg:items-start">
              <div className="flex flex-col items-start gap-4">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg className="h-36 w-36" viewBox="0 0 180 180" aria-label="Stress score">
                    <defs>
                      <linearGradient
                        id="heroDonutGradient"
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={STRESS_COLORS.low} />
                        <stop offset="55%" stopColor={STRESS_COLORS.mid} />
                        <stop offset="100%" stopColor={donutEndColor} />
                      </linearGradient>
                    </defs>
                    <circle cx="90" cy="90" r={donutRadius} stroke="#e9edf5" strokeWidth={donutStroke} fill="none" />
                    {donutProgressRaw > 0 && (
                      <path
                        d={donutArc}
                        stroke="url(#heroDonutGradient)"
                        strokeWidth={donutStroke}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-semibold text-slate-900">{score.toFixed(1)}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">/10</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p className={`text-base font-semibold ${stressState.statusColor}`}>{stressState.label}</p>
                  <p className="text-sm font-semibold text-slate-600">{trendLabel}</p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{isRu ? "Динамика" : "Trend"}</span>
                  <span className="text-primary">{isRu ? "Стресс / вовлечённость" : "Stress · engagement"}</span>
                </div>
                <HeroTrendChart data={trendData} className="h-52 w-full" />
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600">!</span>
                  {isRu ? "Фокус недели" : "Your focus"}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {focusMetrics.map((metric) => {
                    const isPositive = metric.delta > 0;
                    const baseRing =
                      metric.state === "warning"
                        ? "ring-rose-200/80 bg-rose-50 text-rose-700"
                        : metric.highlight
                          ? "ring-primary/30 bg-primary/5 text-slate-900"
                          : "ring-slate-200/80 bg-slate-50/80 text-slate-800";

                    return (
                      <div
                        key={metric.title}
                        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold ring-1 shadow-[0_10px_26px_rgba(76,103,255,0.06)] ${baseRing}`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                            metric.state === "warning"
                              ? "bg-rose-100 text-rose-700"
                              : metric.state === "positive"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-white text-primary"
                          }`}
                        >
                          {metric.value.toFixed(1)}
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isPositive ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {formatDelta(metric.delta)}
                            </span>
                            {metric.state === "warning" && (
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4 text-amber-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9.05 2.927c.35-.61 1.23-.61 1.58 0l7.07 12.338c.35.61-.09 1.375-.79 1.375H2.77c-.7 0-1.14-.765-.79-1.375L9.05 2.927Zm1.58 9.123V9.25c0-.35-.28-.63-.63-.63h-.4c-.35 0-.63.28-.63.63v2.8c0 .35.28.63.63.63h.4c.35 0 .63-.28.63-.63Zm-.03 2.09c0-.44-.36-.8-.8-.8h-.36c-.44 0-.8.36-.8.8v.36c0 .44.36.8.8.8h.36c.44 0 .8-.36.8-.8v-.36Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-600">{metric.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {isRu ? "Где вы сильны" : "Here’s where you are thriving"}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {thrivingMetrics.map((metric) => (
                    <div
                      key={metric.title}
                      className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100 shadow-[0_12px_22px_rgba(16,185,129,0.12)]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-bold text-emerald-600">
                        {metric.value.toFixed(1)}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-emerald-600">{formatDelta(metric.delta)}</span>
                        <p className="text-xs font-semibold text-emerald-900">{metric.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
