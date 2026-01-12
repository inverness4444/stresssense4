import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

export default async function DemoShowcase() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const bulletItems = isRu
    ? [
        "Manager cockpit: стресc, engagement, action center и AI",
        "Employee home: привычки, коуч, обучение и чек-листы",
        "Онбординг, цели, 1:1, фидбэк и признание — всё связано",
        "Автоматизация: nudges, playbooks, отчёты и эксперименты",
      ]
    : [
        "Manager cockpit: stress, engagement, action center, and AI",
        "Employee home: habits, coach, learning, and checklists",
        "Onboarding, goals, 1:1s, feedback, and recognition — all connected",
        "Automation: nudges, playbooks, reports, and experiments",
      ];
  return (
    <section id="demo" className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-emerald-50" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 lg:flex-row lg:items-center lg:gap-14">
        <div className="flex-1 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{isRu ? "Посмотрите демо" : "See the demo"}</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{isRu ? "Как выглядит StressSense в деле" : "What StressSense looks like in action"}</h2>
          <p className="max-w-xl text-slate-600">
            {isRu
              ? "Любой может открыть демо и увидеть, что получают команды после покупки: дашборды стресса и вовлечённости, cockpit менеджера, личный wellbeing-центр сотрудника и автоматические действия."
              : "Anyone can open the demo and see what teams get after purchase: stress and engagement dashboards, the manager cockpit, the employee wellbeing home, and automated actions."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5"
            >
              {isRu ? "Начать trial" : "Start trial"}
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {bulletItems.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full max-w-xl flex-1">
          <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-24 h-24 w-24 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl bg-white/95 p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">{isRu ? "Обзор стресса и вовлечённости" : "Stress & engagement overview"}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{isRu ? "Оценка вовлечённости" : "Engagement score"}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">8.4</p>
                <p className="text-xs text-emerald-600">{isRu ? "+0.6 pt за 6 мес" : "+0.6 pt over 6 mo"}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary" style={{ width: "84%" }} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{isRu ? "Риск и стресс" : "Risk & stress"}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">Low</p>
                <p className="text-xs text-amber-600">{isRu ? "Внимание к дедлайнам Q2" : "Watch Q2 deadlines"}</p>
                <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-primary/10 via-white to-amber-50 ring-1 ring-slate-100">
                  <div className="flex h-full items-end gap-2 px-3 pb-3">
                    {[35, 45, 50, 42, 38, 32].map((v, idx) => (
                      <div key={idx} className="flex-1 rounded-full bg-primary/50" style={{ height: `${v}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Action center</p>
                <ul className="mt-2 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {isRu ? "Nudge: признание для команды" : "Nudge: team recognition"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {isRu ? "Шаг онбординга просрочен" : "Onboarding step overdue"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {isRu ? "Goal check-in в ожидании" : "Goal check-in pending"}
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-900">AI coach</p>
                <p className="mt-2 text-xs text-slate-700">
                  {isRu
                    ? "«Баланс нагрузки держится за счёт чётких приоритетов. Попробуй 30-мин ретро и назначь 1:1 по итогам спринта»."
                    : "“Workload stays balanced thanks to clear priorities. Try a 30-min retro and schedule 1:1s after the sprint.”"}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{isRu ? "3 курса" : "3 courses"}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{isRu ? "5 привычек" : "5 habits"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">2 1:1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
