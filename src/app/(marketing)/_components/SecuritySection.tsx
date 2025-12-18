import { getLocale } from "@/lib/i18n-server";

export default async function SecuritySection() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const bullets = isRu
    ? [
        "Ролевой доступ, аудит-лог и контроль действий",
        "Нет индивидуального мониторинга — только агрегированные инсайты",
        "Экспорт в DWH без PII, data minimization по умолчанию",
        "Data regions, SSO и SCIM по запросу",
      ]
    : [
        "Role-based access, audit log, and action controls",
        "No individual monitoring — only aggregated insights",
        "DWH export without PII, data minimization by default",
        "Data regions, SSO, and SCIM on request",
      ];
  return (
    <section id="security" className="bg-slate-900 py-16 text-slate-50 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Security & privacy</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{isRu ? "Безопасность и приватность по умолчанию" : "Security and privacy by default"}</h2>
        <p className="mt-3 max-w-3xl text-base text-slate-200/80">
          {isRu
            ? "StressSense построен как privacy-first: строгий доступ, никакого «шпионажа» за людьми, только агрегаты, регионы данных и прозрачный экспорт."
            : "StressSense is built privacy-first: strict access, no “surveillance,” only aggregates, data regions, and transparent export."}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {bullets.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-800/70 p-5 ring-1 ring-white/5">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">✓</span>
              <p className="text-sm text-slate-100">{item}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">
          {["RBAC", "Audit log", "No PII", "Data regions"].map((tag) => (
            <span key={tag} className="rounded-full bg-slate-800 px-3 py-1 ring-1 ring-white/5">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
