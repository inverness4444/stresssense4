const solutions = [
  {
    badge: "HR",
    title: "Для HR-команд",
    points: [
      "Единая картина стресса и вовлечённости",
      "Готовые playbooks и nudges",
      "Грейды, ревью, онбординг — всё в одном месте",
    ],
  },
  {
    badge: "Managers",
    title: "Для менеджеров",
    points: [
      "Cockpit: метрики команды и Action center",
      "AI-подсказки и планы на 30/60/90 дней",
      "1:1, цели и признание в одном интерфейсе",
    ],
  },
  {
    badge: "Employees",
    title: "Для сотрудников",
    points: [
      "Личный wellbeing: привычки, коуч и обучение",
      "Прозрачные ожидания и прогресс",
      "Friendly nudges без контроля и микроменеджмента",
    ],
  },
];

export default function SolutionsSection() {
  return (
    <section id="solutions" className="bg-slate-50/50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Solutions</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Команды, для которых StressSense даёт максимум эффекта</h2>
          <p className="mt-3 text-base text-slate-600">HR, менеджеры и сотрудники видят ровно то, что им нужно, в одном продукте.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {solution.badge}
              </span>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{solution.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {solution.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
