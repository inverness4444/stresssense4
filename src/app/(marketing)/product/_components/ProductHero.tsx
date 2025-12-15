import Link from "next/link";

export default function ProductHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white pb-16 pt-20 sm:pb-24 sm:pt-24" id="overview">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-emerald-50" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm ring-1 ring-primary/10">
            Product tour
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-5xl">
            Одна платформа для стресса, вовлечённости и работы с людьми.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Узнайте, как StressSense соединяет аналитку стресса, cockpit менеджера, wellbeing-среду для сотрудников, People & Comp и AI-автоматизацию.
          </p>
          <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {[
              "Пульс-опросы, engagement index и risk engine",
              "Manager cockpit с действиями, 1:1, целями и onboarding",
              "Личный wellbeing-центр, AI-коуч, привычки и обучение",
              "Compensation, journeys, интеграции и автоматизация AI",
            ].map((item) => (
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
              Начать free trial
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
            >
              Смотреть product tour
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Без карты · онбординг за 2 минуты</p>
        </div>

        <div className="relative w-full max-w-xl flex-1">
          <div className="absolute -left-10 top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-24 h-24 w-24 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="relative space-y-4 rounded-3xl bg-white/90 p-5 shadow-2xl shadow-primary/10 ring-1 ring-slate-200">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Team health overview</p>
                <p className="text-xs text-slate-500">Stress & engagement</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">8.4 / 10</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Manager cockpit</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Action center</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Nudge: признание для команды
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    1:1 и цели в одном потоке
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Onboarding шаги под контролем
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employee home</p>
                <p className="mt-2 text-sm text-slate-800">Wellbeing, привычки, обучение и AI-коуч — без лишнего шума.</p>
                <div className="mt-4 rounded-xl bg-white/70 p-3 text-xs text-slate-600">
                  Привычки: 5/7 · Курсы: 2 активны · Настроение: 4/5
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trends</p>
              <div className="mt-3 h-28 rounded-xl bg-gradient-to-br from-primary/10 via-white to-emerald-50 ring-1 ring-slate-100">
                <div className="flex h-full items-end gap-2 px-4 pb-4">
                  {[40, 55, 63, 68, 72, 78, 84].map((val, idx) => (
                    <div key={idx} className="flex-1 rounded-full bg-primary/50" style={{ height: `${val}%` }} />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <span>Stress → Engagement</span>
                <span className="font-semibold text-emerald-600">+12% за 3 мес.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
