import { getLocale } from "@/lib/i18n-server";

export default async function SectionAIAutomation() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const cards = isRu
    ? [
        { title: "AI coach для сотрудников", text: "Личные подсказки, привычки и обучение без раскрытия личных данных. Ответы идут через privacy слой и анонимизацию." },
        { title: "AI lens для менеджеров", text: "Summary рисков, сильных сторон и действий по команде. Action center с готовыми шагами и playbooks." },
        { title: "AI для HR/People", text: "Подсказки для 1:1, целей, onboarding-шагов и комп-циклов. Никаких решений за людей — только предложения." },
        { title: "Privacy-first", text: "Анонимизация, min responses, data minimization. Никаких сырых PII в моделях, только агрегаты и безопасные фичи." },
      ]
    : [
        { title: "AI coach for employees", text: "Personal tips, habits, and learning without exposing personal data. Answers pass through a privacy layer and anonymization." },
        { title: "AI lens for managers", text: "Summaries of risks, strengths, and actions for the team. Action center with ready steps and playbooks." },
        { title: "AI for HR/People", text: "Guidance for 1:1s, goals, onboarding steps, and comp cycles. No decisions for people — only suggestions." },
        { title: "Privacy-first", text: "Anonymization, min responses, data minimization. No raw PII in models, only aggregates and safe features." },
      ];

  return (
    <section id="ai" className="relative overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-white to-indigo-50" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">AI & automation</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{isRu ? "AI, который коучит, а не просто отчёт" : "AI that coaches, not just reports"}</h2>
          <p className="mx-auto max-w-3xl text-slate-600">
            {isRu
              ? "Подсказки, summary, предложения по действиям и автоматизация nudges/шагов — всё с учётом приватности и прозрачности."
              : "Guidance, summaries, action suggestions, and automation of nudges/steps — all with privacy and transparency in mind."}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">✦</div>
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-700">{card.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900 px-6 py-5 text-sm text-slate-100">
          <p className="font-semibold">"No raw personal data leaves your tenant"</p>
          <p className="mt-2 text-slate-300">
            {isRu
              ? "AI работает поверх агрегированных данных и анонимизированных фрагментов. Управление доступами и фичами — через role-based access и feature flags."
              : "AI works on aggregated data and anonymized fragments. Access and features are controlled through role-based access and feature flags."}
          </p>
        </div>
      </div>
    </section>
  );
}
