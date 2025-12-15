export default function SectionEmployeeExperience() {
  return (
    <section id="employee" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative order-1 overflow-hidden rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">My wellbeing</p>
                <p className="text-lg font-semibold text-slate-900">Баланс и прозрачность</p>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">AI coach</div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Wellbeing гейдж</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">7.9</p>
                <p className="text-xs text-emerald-600">+0.3 за 30 дней</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: "79%" }} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Привычки & чек-ины</p>
                <p className="mt-2 text-xs text-slate-700">5 привычек в прогрессе · 3 отметки сегодня · чек-ин настроения 4/5</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                  {["Фокус", "Движение", "Восстановление"].map((label, idx) => (
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
                <p className="mt-2 text-xs text-slate-700">Курс: Stress-aware leadership · 45% завершено</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: "45%" }} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Nudges & подсказки</p>
                <p className="mt-2 text-xs text-slate-700">Напоминание: завершить onboarding-шаг · Благодарность от команды</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">AI summary</p>
                <p className="mt-2 text-xs text-slate-700">«Сохраняй баланс: привычки на подъёме, но стресс от дедлайнов растёт. Попробуй распределить нагрузку и выделить время на восстановление».</p>
              </div>
            </div>
          </div>

          <div className="order-2 space-y-4 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Employee experience</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Спокойный, понятный дом для каждого сотрудника</h2>
            <p className="text-slate-600">
              У сотрудников есть личный wellbeing-центр: привычки, AI-коуч, обучение, чек-ины и nudges — всё в одном месте. Это поддержка, а не контроль.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              {[
                "Привычки и чек-ины с понятной динамикой",
                "AI-коуч и подсказки без раскрытия личных данных",
                "Учёба и онбординг шагают вместе: Academy + Journeys",
                "Личная история прогресса, которую можно продолжить в любом моменте",
              ].map((item) => (
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
