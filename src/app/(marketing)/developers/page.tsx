export const metadata = {
  title: "StressSense API & webhooks",
};

const codeBlock = `curl -X GET \\
  -H "Authorization: Bearer sk_org_xxx..." \\
  https://your-app-url.com/api/public/v1/metrics/overview`;

export default function DevelopersDocsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Developers</p>
        <h1 className="text-3xl font-semibold text-slate-900">StressSense API & webhooks</h1>
        <p className="text-lg text-slate-600">
          Connect stress insights to your HR stack, dashboards, and internal tools. Create API keys, listen to webhooks, or embed read-only
          widgets in your portal.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Authentication</h2>
        <p className="mt-2 text-sm text-slate-600">Use API keys from your workspace. Include them in the Authorization header.</p>
        <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-sm">
          <pre className="whitespace-pre-wrap">{codeBlock}</pre>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">REST API</h3>
          <p className="text-sm text-slate-600">Read surveys, employees, and metrics under /api/public/v1.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Webhooks</h3>
          <p className="text-sm text-slate-600">Subscribe to events like survey.created or survey.response.created.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Embeds</h3>
          <p className="text-sm text-slate-600">Drop-in JS SDK to render stress metrics on your intranet.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Webhook payload</h2>
        <pre className="mt-3 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-sm">
{`{
  "id": "evt_123",
  "type": "survey.response.created",
  "createdAt": "2025-01-01T10:00:00Z",
  "workspace": { "id": "org_123", "name": "Acme" },
  "data": { "surveyId": "surv_123", "responseId": "resp_456" }
}`}
        </pre>
        <p className="mt-2 text-sm text-slate-600">Verify signature header X-StressSense-Signature (HMAC SHA256 of the raw body).</p>
      </section>
    </div>
  );
}
