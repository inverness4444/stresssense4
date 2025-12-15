export default function ManagerDeepDive() {
  return (
    <section id="manager" className="bg-slate-50 py-16 lg:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Manager cockpit</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Все риски, действия и люди — в одном месте</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              «See team stress & engagement in one place» — метрики, тренды и AI-summary.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              Action center с AI-подсказками: онбординг, цели, 1:1, фидбэк, компенсации.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              Нуджи и автоматизация: Slack/Teams, календарь, вебхуки и API.
            </li>
          </ul>
        </div>
        <div className="relative w-full flex-1">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-20 w-20 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="relative rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Manager view</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Team health</p>
                <p className="mt-2 text-3xl font-bold text-primary">8.1</p>
                <p className="text-xs text-slate-500">+0.5 pt vs прошлый месяц</p>
                <div className="mt-3 h-16 rounded-xl bg-white/70 ring-1 ring-slate-100">
                  <div className="flex h-full items-end gap-1 px-3 pb-2">
                    {[30, 40, 50, 70, 90].map((h, i) => (
                      <div key={i} className="flex-1 rounded-full bg-primary/60" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Action center</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Onboarding step overdue</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">due</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>Goal check-in: Q2</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">today</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span>AI suggestion: reduce load</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">AI</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Upcoming</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Pulse survey · Thu</span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">1:1 with Dana · Fri</span>
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Retro · Mon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
