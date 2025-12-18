import { getLocale } from "@/lib/i18n-server";

export default async function SectionEmployeeExperience() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const tags = isRu ? ["Фокус", "Движение", "Восстановление"] : ["Focus", "Movement", "Recovery"];
  const bullets = isRu
    ? [
        "Привычки и чек-ины с понятной динамикой",
        "AI-коуч и подсказки без раскрытия личных данных",
        "Учёба и онбординг шагают вместе: Academy + Journeys",
        "Личная история прогресса, которую можно продолжить в любом моменте",
      ]
    : [
        "Habits and check-ins with clear progress",
        "AI coach and tips without exposing personal data",
        "Learning and onboarding in sync: Academy + Journeys",
        "Personal progress history you can continue anytime",
      ];
  return (
    <section id="employee" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative order-1 overflow-hidden rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{isRu ? "Моё благополучие" : "My wellbeing"}</p>
                <p className="text-lg font-semibold text-slate-900">{isRu ? "Баланс и прозрачность" : "Balance and clarity"}</p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">AI coach</div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{isRu ? "Wellbeing гейдж" : "Wellbeing gauge"}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">7.9</p>
                <p className="text-xs text-emerald-600">{isRu ? "+0.3 за 30 дней" : "+0.3 in 30 days"}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: "79%" }} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{isRu ? "Привычки & чек-ины" : "Habits & check-ins"}</p>
                <p className="mt-2 text-xs text-slate-700">
                  {isRu ? "5 привычек в прогрессе · 3 отметки сегодня · чек-ин настроения 4/5" : "5 habits in progress · 3 check-ins today · mood check 4/5"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                  {tags.map((label, idx) => (
                    <div key={label} className="rounded-xl bg-white/80 p-2 ring-1 ring-slate-100">
                      <p className="font-semibold text-slate-700">{label}</p>
                      <p className="mt-1 text-slate-600">{idx === 0 ? "3/5" : idx === 1 ? "4/5" : "2/4"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">My learning</p>
                <p className="mt-2 text-xs text-slate-700">
                  {isRu ? "Курс: Stress-aware leadership · 45% завершено" : "Course: Stress-aware leadership · 45% complete"}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: "45%" }} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{isRu ? "Nudges & подсказки" : "Nudges & tips"}</p>
                <p className="mt-2 text-xs text-slate-700">
                  {isRu ? "Напоминание: завершить onboarding-шаг · Благодарность от команды" : "Reminder: finish onboarding step · Kudos from the team"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">AI summary</p>
                <p className="mt-2 text-xs text-slate-700">
                  {isRu
                    ? "«Сохраняй баланс: привычки на подъёме, но стресс от дедлайнов растёт. Попробуй распределить нагрузку и выделить время на восстановление»."
                    : "“Keep balance: habits are improving, but deadline stress is rising. Rebalance workload and add recovery time.”"}
                </p>
              </div>
            </div>
          </div>

          <div className="order-2 space-y-4 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Employee experience</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {isRu ? "Спокойный, понятный дом для каждого сотрудника" : "A calm, clear home for every employee"}
            </h2>
            <p className="text-slate-600">
              {isRu
                ? "У сотрудников есть личный wellbeing-центр: привычки, AI-коуч, обучение, чек-ины и nudges — всё в одном месте. Это поддержка, а не контроль."
                : "Employees get a personal wellbeing hub: habits, AI coach, learning, check-ins, and nudges — all in one place. It's support, not surveillance."}
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
