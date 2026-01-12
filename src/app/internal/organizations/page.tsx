import { prisma } from "@/lib/prisma";

export default async function OrganizationsList() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      surveys: { include: { responses: true } },
      slackIntegration: true,
      hrisIntegration: true,
    },
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Organizations</h1>
        <p className="text-sm text-slate-600">Internal view of all workspaces.</p>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {orgs.map((org: any) => (
          <div key={org.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold text-slate-900">{org.name}</p>
              <p className="text-xs text-slate-500">
                Billing: per-seat · Seats: {org.subscription?.seats ?? "—"} · Surveys: {org.surveys.length} · Responses:{" "}
                {org.surveys.reduce((acc: any, s: any) => acc + s.responses.length, 0)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              {org.slackIntegration && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Slack</span>}
              {org.hrisIntegration && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">HRIS</span>}
              <a href={`/internal/organizations/${org.id}`} className="rounded-full px-3 py-1 text-primary ring-1 ring-primary/30 hover:bg-primary/10">
                View
              </a>
            </div>
          </div>
        ))}
        {orgs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No organizations found.</p>}
      </div>
    </div>
  );
}
