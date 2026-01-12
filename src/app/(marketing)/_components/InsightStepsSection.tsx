import { getLocale } from "@/lib/i18n-server";

export default async function InsightStepsSection() {
  const locale = await getLocale();
  const isRu = locale === "ru";

  const steps = [
    {
      title: isRu ? "Пульс-опросы за 30 секунд" : "30-sec daily pulses",
      subtitle: isRu ? "Анонимные сигналы" : "Anonymous signals",
      caption: isRu ? "Результаты только в агрегатах · без личных данных" : "Aggregated only · no personal data",
    },
    {
      title: isRu ? "Агрегаты по командам" : "Team-level aggregates",
      subtitle: isRu ? "Heatmaps, динамика по времени и драйверы" : "Heatmaps, time trends, and drivers",
      caption: isRu ? "Risk/anomaly detection без PII, только агрегаты" : "Risk/anomaly detection without PII, only aggregates",
    },
    {
      title: isRu ? "Индивидуальный отчёт сотрудника" : "Personal employee report",
      subtitle: isRu ? "AI-коуч и подсказки без раскрытия личных данных" : "AI coach and tips without exposing personal data",
      caption: isRu ? "Привычки и чек-ины с понятной динамикой" : "Habits and check-ins with clear progress",
    },
  ];

  return (
    <section id="steps" className="bg-[#f7f2ed] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {isRu ? "StressSense" : "StressSense"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            {isRu
              ? "Простые инсайты. Чёткое направление. Вовлечённость в 3 шага."
              : "Simple insight. Clear direction. Better engagement in 3 steps."}
          </h2>
          <p className="mt-4 text-base text-slate-600">
            {isRu
              ? "Пульс-опросы, агрегаты и личные отчёты показывают, где нужна поддержка — без «шпионажа» и личных данных."
              : "Pulses, team aggregates, and personal reports show where support is needed — without surveillance or personal data."}
          </p>
        </div>

        <div className="mt-10">
          <div className="relative hidden items-center justify-between text-sm font-semibold text-slate-700 lg:flex">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-primary shadow-sm ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <span>{step.title}</span>
              </div>
            ))}
            <svg className="pointer-events-none absolute left-[31%] top-2 h-6 w-24 text-primary" viewBox="0 0 120 24" fill="none">
              <path d="M2 20 C40 4, 80 4, 118 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M112 14 L118 20 L110 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <svg className="pointer-events-none absolute left-[62%] top-1 h-6 w-24 text-primary" viewBox="0 0 120 24" fill="none">
              <path d="M2 20 C40 4, 80 4, 118 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M112 14 L118 20 L110 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="relative rounded-[32px] bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-6 text-white shadow-2xl shadow-indigo-500/30 lg:-rotate-2 lg:translate-y-2">
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-indigo-400/30 blur-2xl" />
              <div className="flex items-center gap-3 text-sm font-semibold lg:hidden">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-indigo-700">
                  1
                </span>
                <span>{steps[0].title}</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white/95 p-4 text-slate-900 shadow-md">
                  <p className="text-sm font-semibold">{steps[0].title}</p>
                  <p className="mt-1 text-xs text-slate-500">{steps[0].subtitle}</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-4 text-slate-900 shadow-md">
                  <p className="text-sm">{steps[0].caption}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                    {isRu ? "Анонимно" : "Anonymous"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 p-4 text-slate-900 shadow-md">
                  <p className="text-sm">
                    {isRu
                      ? "Ответы идут через privacy слой и анонимизацию."
                      : "Answers pass through a privacy layer and anonymization."}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{isRu ? "Только агрегаты" : "Aggregates only"}</p>
                </div>
              </div>
            </div>

            <div className="relative rounded-[32px] bg-white p-6 shadow-2xl shadow-slate-200 ring-1 ring-slate-200 lg:rotate-1">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 lg:hidden">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-primary">
                  2
                </span>
                <span>{steps[1].title}</span>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {steps[1].title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{steps[1].subtitle}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    6.5 ↑ 1.1
                  </div>
                </div>
                <div className="mt-4 h-28 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <svg viewBox="0 0 260 80" className="h-full w-full">
                    <path
                      d="M0 60 C40 45, 70 50, 100 40 C130 30, 160 35, 190 20 C220 10, 240 18, 260 8"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0 60 C40 45, 70 50, 100 40 C130 30, 160 35, 190 20 C220 10, 240 18, 260 8 L260 80 L0 80 Z"
                      fill="url(#trendFill)"
                    />
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p className="mt-3 text-xs text-slate-600">{steps[1].caption}</p>
              </div>
              <button className="mt-4 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                {isRu ? "Драйверы и тренды" : "Drivers & trends"}
              </button>
            </div>

            <div className="relative rounded-[32px] bg-gradient-to-br from-indigo-600 via-violet-500 to-rose-500 p-1 shadow-2xl shadow-violet-300/40 lg:rotate-2 lg:-translate-y-2">
              <div className="rounded-[28px] bg-white p-6">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 lg:hidden">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-primary">
                    3
                  </span>
                  <span>{steps[2].title}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {steps[2].title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{steps[2].subtitle}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">AI coach</span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{steps[2].caption}</p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {isRu ? "Моё благополучие" : "My wellbeing"}
                  </p>
                  <p className="mt-2 text-xs text-slate-700">
                    {isRu
                      ? "У сотрудников есть личный wellbeing-центр: привычки, AI-коуч, обучение, чек-ины и nudges — всё в одном месте."
                      : "Employees get a personal wellbeing hub: habits, AI coach, learning, check-ins, and nudges — all in one place."}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-emerald-500" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">AI</span>
                  {isRu ? "Спросить AI-коуча" : "Ask AI coach"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
