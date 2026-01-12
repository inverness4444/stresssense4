import { useMemo } from "react";

const solutions = (isRu: boolean) => [
  {
    badge: "Admin",
    title: isRu ? "Для админ-команд" : "For admin teams",
    points: [
      isRu ? "Единая картина стресса и вовлечённости" : "Unified view of stress and engagement",
      isRu ? "Готовые playbooks и nudges" : "Ready playbooks and nudges",
      isRu ? "Грейды, ревью, онбординг — всё в одном месте" : "Grades, reviews, onboarding — all in one place",
    ],
  },
  {
    badge: "Managers",
    title: isRu ? "Для менеджеров" : "For managers",
    points: [
      isRu ? "Cockpit: метрики команды и Action center" : "Cockpit: team metrics and Action center",
      isRu ? "AI-подсказки и планы на 30/60/90 дней" : "AI tips and 30/60/90 plans",
      isRu ? "1:1, цели и признание в одном интерфейсе" : "1:1s, goals, and recognition in one place",
    ],
  },
  {
    badge: "Employees",
    title: isRu ? "Для сотрудников" : "For employees",
    points: [
      isRu ? "Личный wellbeing: привычки, коуч и обучение" : "Personal wellbeing: habits, coach, learning",
      isRu ? "Прозрачные ожидания и прогресс" : "Clear expectations and progress",
      isRu ? "Friendly nudges без контроля и микроменеджмента" : "Friendly nudges without control and micromanagement",
    ],
  },
];

export default function SolutionsSection() {
  const isRu = useMemo(() => {
    if (typeof document !== "undefined") {
      return (document.documentElement.lang || "").toLowerCase().startsWith("ru");
    }
    return false;
  }, []);
  return (
    <section id="solutions" className="bg-slate-50/50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isRu ? "Решения" : "Solutions"}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
            {isRu ? "Команды, для которых StressSense даёт максимум эффекта" : "Teams where StressSense delivers the most impact"}
          </h2>
          <p className="mt-3 text-base text-slate-600">
            {isRu ? "Админы, менеджеры и сотрудники видят ровно то, что им нужно, в одном продукте." : "Admins, managers, and employees see exactly what they need in one product."}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {solutions(isRu).map((solution) => (
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
