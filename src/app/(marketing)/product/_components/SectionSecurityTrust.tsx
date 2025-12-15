export default function SectionSecurityTrust() {
  return (
    <section id="security" className="bg-slate-50/80 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Security & trust</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Безопасность и приватность по умолчанию</h2>
          <p className="mx-auto max-w-3xl text-slate-600">
            Ролевая модель доступа, анонимные агрегаты, минимизация данных и аудит. Никакого “скрытого наблюдения” — только то, что нужно HR и менеджерам.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["Role-based access & audit", "Data minimization & PII-safe", "Data residency & DWH без PII", "Min responses thresholds", "Feature flags & experiments", "SSO/SCIM/HRIS управление"].map((item) => (
            <div key={item} className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
