const steps = [
  {
    title: "Подключите инструменты",
    text: "HRIS, Slack/Teams, календари, SSO — импортируйте людей и команды за часы, не за недели.",
  },
  {
    title: "Запускайте pulse и journeys",
    text: "Шаблоны опросов, онбординга и привычек для ролей. AI помогает настроить за 15 минут.",
  },
  {
    title: "Получайте инсайты и действуйте",
    text: "Engagement score, риски, Action center, playbooks и nudges — всё в одном месте.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Три шага, чтобы увидеть стрессы и закрыть их</h2>
          <p className="mt-3 text-base text-slate-600">Подключите, запустите, действуйте — прозрачный путь к здоровым командам.</p>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
          <div className="relative space-y-6">
            <div className="absolute left-[14px] top-6 h-[80%] w-[2px] rounded-full bg-gradient-to-b from-primary/20 via-primary/40 to-primary/0" />
            {steps.map((step, idx) => (
              <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="absolute -left-1 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-lg">
                  {idx + 1}
                </div>
                <h3 className="pl-10 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 pl-10 text-sm text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-lg shadow-primary/10">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-100">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">1</span>
                <div>
                  <p className="font-semibold text-slate-900">Integration hub</p>
                  <p className="text-xs text-slate-600">Slack · HRIS · Calendar · SSO</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-100">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">2</span>
                <div>
                  <p className="font-semibold text-slate-900">Pulse & journeys</p>
                  <p className="text-xs text-slate-600">Опросы + onboarding/role-change планы</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-100">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">3</span>
                <div>
                  <p className="font-semibold text-slate-900">Insights → Actions</p>
                  <p className="text-xs text-slate-600">AI-линза, playbooks, Action center</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
