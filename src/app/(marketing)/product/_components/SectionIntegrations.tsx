const integrations = ["Slack", "Teams", "Workday", "BambooHR", "Google Calendar", "DWH export", "Public API", "Webhooks"];

export default function SectionIntegrations() {
  return (
    <section id="integrations" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Integrations</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Работает с тем, что у вас уже есть</h2>
          <p className="mx-auto max-w-3xl text-slate-600">Slack/Teams для уведомлений, HRIS/SSO/SCIM для данных, календари для 1:1, публичный API и вебхуки для автоматизации.</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {integrations.map((name) => (
            <div key={name} className="flex items-center justify-center rounded-2xl bg-white p-3 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
