"use client";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const groups = {
  comms: ["Slack", "Microsoft Teams"],
  people: ["Workday", "BambooHR", "HRIS"],
  automation: ["Public API", "Webhooks", "DWH Export"],
  security: ["SSO", "SCIM", "Role-based access"],
};

export default function IntegrationsSection() {
  const [tab, setTab] = useState<keyof typeof groups>("comms");
  const pathname = usePathname();
  const isRu = useMemo(() => pathname?.includes("/ru") || (typeof document !== "undefined" ? (document.documentElement.lang || "").startsWith("ru") : false), [pathname]);
  const integrations = groups[tab];
  return (
    <section id="integrations" className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Integrations</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              {isRu ? "Подключается к инструментам, которые вы уже используете" : "Connects to tools you already use"}
            </h2>
            <p className="mt-3 text-base text-slate-600">
              {isRu
                ? "Slack и Teams для nudges, HRIS для структуры, календари для 1:1 и DWH-экспорт — всё управляется из Admin console за часы, а не месяцы."
                : "Slack and Teams for nudges, HRIS for structure, calendars for 1:1s, and DWH export — all managed from Admin console in hours, not months."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
              {[
                { key: "comms", label: isRu ? "Коммуникации" : "Communications" },
                { key: "people", label: isRu ? "Данные People" : "People data" },
                { key: "automation", label: isRu ? "Автоматизация" : "Automation" },
                { key: "security", label: isRu ? "Безопасность" : "Security" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key as keyof typeof groups)}
                  className={`rounded-full px-3 py-1 transition ${
                    tab === item.key ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {integrations.map((name) => (
                <div key={name} className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  {name}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-lg shadow-primary/10">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm font-semibold text-slate-800">
              <span>{isRu ? "Центр интеграций" : "Integration center"}</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{isRu ? "Активно" : "Active"}</span>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {(isRu ? ["Slack nudges", "Синк календаря", "Структура HRIS", "SSO / SCIM"] : ["Slack nudges", "Calendar sync", "HRIS structure", "SSO / SCIM"]).map((item) => (
                <div key={item} className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                  <span>{item}</span>
                  <span className="flex items-center gap-2 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> ON
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
