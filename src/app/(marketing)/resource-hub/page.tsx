const resources = [
  { title: "Guide: запуск stress pulse за 2 недели", type: "Guide" },
  { title: "Template: разговор с командой про нагрузку", type: "Template" },
  { title: "Checklist: onboarding менеджера", type: "Checklist" },
  { title: "Webinar: AI-коучинг для People-команд", type: "Webinar" },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Resources</p>
          <h1 className="text-4xl font-bold text-slate-900">Материалы для админов и менеджеров</h1>
          <p className="text-sm text-slate-600">Гайды, шаблоны и вебинары, чтобы быстрее начать работать со StressSense.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {resources.map((r) => (
            <div key={r.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{r.type}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{r.title}</p>
              <p className="mt-2 text-sm text-slate-600">Скачайте материал и используйте его в команде.</p>
              <button className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:shadow-sm">
                Скачать
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
