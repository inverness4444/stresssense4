export default function EmployeeDeepDive() {
  return (
    <section id="employee" className="py-16 lg:py-20">
      <div className="mx-auto flex max-w-6xl flex-col-reverse gap-10 px-4 lg:flex-row lg:items-center">
        <div className="relative w-full flex-1">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employee home</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-4">
                <p className="text-sm font-semibold text-slate-900">My wellbeing</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">Stable</p>
                <p className="text-xs text-slate-500">Stress 5.8 · Mood 4.2 · Habits 78%</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Habits & streaks</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Десять минут прогулки</span>
                    <span className="text-emerald-600">done</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Нет почты после 20:00</span>
                    <span className="text-amber-600">today</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Фокус-блок 90 минут</span>
                    <span className="text-slate-500">later</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <p className="font-semibold text-slate-900">Learning</p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">Academy</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">Stress-smart communication · 62% complete</p>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-primary" style={{ width: "62%" }} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AI lens</p>
              <p className="mt-2 text-sm text-slate-700">
                «У тебя неплохо с привычками, но растёт стресс из-за дедлайнов. Попробуй фокус-блоки и короткое 1:1 с менеджером».
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Employee experience</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Личный wellbeing-центр для каждого</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              Привычки, чек-ины, курсы и AI-коуч — всё в одном удобном потоке.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              Сотрудник видит только себя: никаких чужих метрик, только собственный прогресс.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              Подсказки «что дальше» — AI-инсайты, связанные с курсами, привычками и задачами.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
