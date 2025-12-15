import LiveDemoExperience from "./_components/LiveDemoExperience";

export const metadata = {
  title: "Live demo | StressSense",
  description: "Interactive StressSense demo — manager and employee views without signup.",
};

export default function DemoPage() {
  return (
    <main className="bg-gradient-to-b from-indigo-50/30 via-white to-white pb-24">
      <section className="relative overflow-hidden pb-12 pt-20 sm:pt-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-white to-emerald-50" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-14">
          <div className="flex-1 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Live demo</p>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">Поиграйте в StressSense прямо в браузере.</h1>
            <p className="max-w-2xl text-lg text-slate-600">
              Мини-кокпит менеджера и личный кабинет сотрудника — без регистрации и реальных данных. Переключайте сценарии, сдвигайте
              метрики, отмечайте задачи и привычки, чтобы почувствовать, как работает продукт.
            </p>
            <ul className="grid max-w-2xl gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {[
                "Менеджер: stress & engagement, action center, AI-линза",
                "Сотрудник: wellbeing, настроение, привычки и мини AI-коуч",
                "Фейковые данные, безопасно · никакого бэкенда",
                "Можно открыть с мобильного и сразу пробовать",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Демо-данные · ничего не сохраняется</p>
          </div>
          <div className="relative w-full max-w-xl flex-1">
            <div className="absolute -left-10 top-10 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute right-0 top-20 h-24 w-24 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="relative rounded-3xl bg-white/90 p-6 shadow-2xl ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Manager & Employee preview</p>
              <p className="text-xs text-slate-600">Движение ползунков и чекбоксов обновляет метрики в реальном времени.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Manager view</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">Engagement 8.4</p>
                  <p className="text-xs text-emerald-600">+0.6 pt · participation 92%</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: "82%" }} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-700">
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Action center</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">AI lens</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employee view</p>
                  <p className="mt-2 text-sm text-slate-800">Привычки, настроение, обучение и советы AI-коуча.</p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    Wellbeing 7.8 · Habits 3/4 · Mood 🙂
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-700">
                    <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">Надежно</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Demo only</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">Попробуйте сами ниже — без регистрации.</div>
            </div>
          </div>
        </div>
      </section>

      <LiveDemoExperience />
    </main>
  );
}
