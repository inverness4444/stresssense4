export default function SectionStressAnalytics() {
  return (
    <section id="stress" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Stress & Engagement</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Аналитика стресса и вовлечённости без лишнего шума</h2>
            <p className="text-slate-600">
              Пульс-опросы, engagement index, risk engine и анонимные сигналы помогают вовремя увидеть тренды. Никакого «шпионажа» — только агрегированные данные и безопасные метрики.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              {["Continuous pulse surveys и engagement index", "Risk/anomaly detection без PII, только агрегаты", "Heatmaps, динамика по времени и драйверы", "Минимальные пороги приватности"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-2xl shadow-primary/5 ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Engagement</p>
                <p className="text-3xl font-bold text-slate-900">8.4 / 10</p>
                <p className="text-xs text-emerald-600">+0.6 pt за 6 месяцев</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Stress index</span>
                  <span className="font-semibold text-amber-600">3.2 / 10</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: "68%" }} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Порог анонимности соблюдён · данные по последнему циклу</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Heatmap & драйверы</p>
                <p className="mt-2 text-xs text-slate-700">Workload · Recognition · Clarity · Leadership · Support</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                  {[
                    { label: "Workload", val: 72 },
                    { label: "Support", val: 81 },
                    { label: "Recognition", val: 77 },
                    { label: "Clarity", val: 69 },
                    { label: "Autonomy", val: 74 },
                    { label: "Growth", val: 70 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-100">
                      <p className="text-[11px] font-semibold text-slate-700">{item.label}</p>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Тренды вовлечённости</p>
                <div className="mt-3 h-32 rounded-xl bg-white/70 ring-1 ring-slate-100">
                  <div className="flex h-full items-end gap-2 px-4 pb-4">
                    {[45, 52, 60, 58, 64, 71, 78].map((val, idx) => (
                      <div key={idx} className="flex-1 rounded-full bg-primary/60" style={{ height: `${val}%` }} />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">AI-линза подсветит ключевые изменения и драйверы</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
