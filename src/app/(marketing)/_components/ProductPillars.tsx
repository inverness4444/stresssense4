const pillars = [
  {
    title: "Stress & engagement analytics",
    text: "Pulse-опросы, индекс вовлечённости, риск-сигналы и тренды без индивидуального трекинга.",
  },
  {
    title: "Manager cockpit & workflows",
    text: "Action center, 1:1, цели, фидбэк, онбординг и компенсации — всё в одном окне.",
  },
  {
    title: "Employee wellbeing & coaching",
    text: "Личный wellbeing-центр, привычки, AI-коуч, Nudges и курсы Academy.",
  },
  {
    title: "Automation & journeys",
    text: "Интеграции, webhooks, AI-рекомендации и готовые journeys 30/60/90 для быстрых запусков.",
  },
];

export default function ProductPillars() {
  return (
    <section id="product" className="py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Product pillars</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Один продукт — четыре опоры для команды</h2>
          <p className="mt-3 text-base text-slate-600">Аналитика, cockpit, wellbeing и автоматизация работают вместе, а не по отдельности.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-center justify-center rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary">{pillar.title.split(" ")[0]}</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{pillar.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{pillar.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
