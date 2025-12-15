export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
      <p className="text-sm text-slate-600">HRIS, SSO/SCIM, Slack/Teams, webhooks, DWH exports. Connect your stack here.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "HR & Identity", body: "HRIS, SSO, SCIM, domain-based login." },
          { title: "Collaboration", body: "Slack/Teams, calendar connections, survey invites." },
          { title: "Automation & Webhooks", body: "Signed webhooks, Zapier/Make, public API." },
          { title: "Data & Analytics", body: "DWH connectors, exports, API usage." },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
            <p className="mt-2 text-sm text-slate-600">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
