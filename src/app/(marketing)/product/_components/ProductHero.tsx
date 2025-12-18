import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

export default async function ProductHero() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white pb-16 pt-20 sm:pb-24 sm:pt-24" id="product">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-emerald-50" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm ring-1 ring-primary/10">
            Product tour
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-5xl">
            {isRu ? "Одна платформа для стресса, вовлечённости и работы с людьми." : "One platform for stress, engagement, and people operations."}
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            {isRu
              ? "Узнайте, как StressSense соединяет аналитику стресса, cockpit менеджера, wellbeing-среду для сотрудников, People & Comp и AI-автоматизацию."
              : "See how StressSense blends stress analytics, a manager cockpit, employee wellbeing, People & Comp, and AI automation in one flow."}
          </p>
          <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {(isRu
              ? [
                  "Пульс-опросы, engagement index и risk engine",
                  "Manager cockpit с действиями, 1:1, целями и onboarding",
                  "Личный wellbeing-центр, AI-коуч, привычки и обучение",
                  "Compensation, journeys, интеграции и автоматизация AI",
                ]
              : [
                  "Pulse surveys, engagement index, and a risk engine",
                  "Manager cockpit with actions, 1:1s, goals, and onboarding",
                  "Personal wellbeing hub, AI coach, habits, and learning",
                  "Compensation, journeys, integrations, and AI automation",
                ]
            ).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5"
            >
              {isRu ? "Начать free trial" : "Start free trial"}
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
            >
              {isRu ? "Смотреть product tour" : "See product tour"}
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isRu ? "Без карты · онбординг за 2 минуты" : "No card needed · onboarding in 2 minutes"}
          </p>
        </div>

        <div className="relative w-full max-w-xl flex-1">
          <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-24 h-24 w-24 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative space-y-4 rounded-3xl bg-white/90 p-5 shadow-2xl shadow-primary/10 ring-1 ring-slate-200">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">{isRu ? "Обзор здоровья команды" : "Team health overview"}</p>
                <p className="text-xs text-slate-500">{isRu ? "Стресс и вовлечённость" : "Stress & engagement"}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">8.4 / 10</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{isRu ? "Кокпит менеджера" : "Manager cockpit"}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{isRu ? "Action center" : "Action center"}</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {isRu ? "Nudge: признание для команды" : "Nudge: team recognition"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {isRu ? "1:1 и цели в одном потоке" : "1:1s and goals in one flow"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {isRu ? "Onboarding шаги под контролем" : "Onboarding steps under control"}
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employee home</p>
                <p className="mt-2 text-sm text-slate-800">
                  {isRu ? "Wellbeing, привычки, обучение и AI-коуч — без лишнего шума." : "Wellbeing, habits, learning, and AI coach without extra noise."}
                </p>
                <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs text-slate-600">
                  {isRu ? "Привычки: 5/7 · Курсы: 2 активны · Настроение: 4/5" : "Habits: 5/7 · Courses: 2 active · Mood: 4/5"}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{isRu ? "Тренды" : "Trends"}</p>
              <div className="mt-3 h-28 rounded-xl bg-gradient-to-br from-primary/10 via-white to-emerald-50 ring-1 ring-slate-100">
                <div className="flex h-full items-end gap-2 px-4 pb-4">
                  {[40, 55, 63, 68, 72, 78, 84].map((val, idx) => (
                    <div key={idx} className="flex-1 rounded-full bg-primary/50" style={{ height: `${val}%` }} />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <span>{isRu ? "Стресс → Вовлечённость" : "Stress → Engagement"}</span>
                <span className="font-semibold text-emerald-600">{isRu ? "+12% за 3 мес." : "+12% in 3 mo."}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
