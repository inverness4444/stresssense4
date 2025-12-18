import { getLocale } from "@/lib/i18n-server";

export default async function SectionManagerCockpit() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const bulletItems = isRu
    ? ["Единый обзор: стресс, engagement, риски и участие", "Action center с playbooks и автоматическими nudges", "Onboarding, цели, 1:1, фидбэк и признание — в контексте"]
    : ["Single view: stress, engagement, risks, and participation", "Action center with playbooks and automated nudges", "Onboarding, goals, 1:1s, feedback, and recognition in context"];
  return (
    <section id="how" className="bg-slate-50/70 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 space-y-4 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Manager cockpit</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {isRu ? "Всё, что нужно менеджеру, в одном месте" : "Everything a manager needs in one place"}
            </h2>
            <p className="text-slate-600">
              {isRu
                ? "Командное здоровье, action center, AI-линза и связка People-процессов. Менеджер видит риски, получает подсказки и запускает действия — без переключения между десятком инструментов."
                : "Team health, action center, AI lens, and connected People workflows. Managers see risks, get guidance, and launch actions—without juggling dozens of tools."}
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              {bulletItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Team health</p>
                  <p className="text-lg font-semibold text-slate-900">{isRu ? "Стабильно • Низкий риск" : "Stable • Low risk"}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {isRu ? "+12% за квартал" : "+12% per quarter"}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Action center</p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {isRu ? "Nudge: признание для маркетинга" : "Nudge: recognition for Marketing"}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {isRu ? "1:1 в ожидании — до пятницы" : "1:1 pending — due by Friday"}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {isRu ? "Цель квартала: обновить прогресс" : "Quarter goal: update progress"}
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">AI lens</p>
                  <p className="mt-2 text-xs text-slate-700">
                    {isRu
                      ? "«Основной риск — переработки в продуктовой команде. Предлагаю перераспределить задачи и провести ретро на следующей неделе»."
                      : "“Main risk is overload in the Product team. Rebalance tasks and run a retro next week.”"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{isRu ? "3 playbooks" : "3 playbooks"}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{isRu ? "2 nudges live" : "2 nudges live"}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{isRu ? "Низкий риск" : "Low risk"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Onboarding & goals</p>
                <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-3">
                  {(isRu ? ["Onboarding", "Цели", "Фидбэк"] : ["Onboarding", "Goals", "Feedback"]).map((label, idx) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                      <p className="font-semibold text-slate-800">{label}</p>
                      <p className="mt-2 text-slate-600">
                        {idx === 0 ? (isRu ? "3 шага просрочены" : "3 steps overdue") : idx === 1 ? (isRu ? "2 цели без апдейта" : "2 goals without updates") : isRu ? "1 фидбэк ждёт" : "1 feedback pending"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
