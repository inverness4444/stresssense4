const aiItems = [
  { title: "AI-коуч", text: "Разговорный коуч для сотрудников и менеджеров, без медицины и диагнозов." },
  { title: "AI-summary", text: "Короткие обзоры опросов и команд, чтобы понимать риски за минуты." },
  { title: "AI-рекомендации", text: "Подсказки по действиям, привычкам, курсам и 1:1 — персонально и безопасно." },
];

export default function AIStrip() {
  return (
    <section id="ai" className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 py-16 lg:py-20 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">AI & automation</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">AI, который коучит и автоматизирует, а не только отчёт</h2>
            <p className="text-base text-indigo-100">
              StressSense AI работает с агрегатами и приватностью по умолчанию: никаких личных диагнозов, только подсказки и действия.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-6 shadow-xl ring-1 ring-white/10 backdrop-blur">
            <div className="space-y-3">
              {aiItems.map((item) => (
                <div key={item.title} className="rounded-2xl bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-indigo-100">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-xs text-indigo-100">
              Пример: «Риск по команде вырос из-за дедлайнов. Назначьте 1:1, перераспределите задачи и добавьте привычку “фокус-блоки 90 мин”».
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
