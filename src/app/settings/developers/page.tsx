import Link from "next/link";

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">API & webhooks</h1>
          <p className="text-sm text-slate-600">Create API clients, tokens, and manage webhooks for your workspace.</p>
        </div>
        <Link
          href="/developers"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:scale-[1.02]"
        >
          Public docs
        </Link>
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">API clients</p>
        <p className="text-sm text-slate-600">Placeholder UI. Wire to ApiClient/ApiToken with scopes and rotation.</p>
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Webhooks</p>
        <p className="text-sm text-slate-600">Add endpoints for survey, risk, coach events. Use signed payloads (HMAC-SHA256).</p>
      </div>
    </div>
  );
}
