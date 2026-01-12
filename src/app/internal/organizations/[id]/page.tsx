import { prisma } from "@/lib/prisma";
import { getRoleLabel } from "@/lib/roles";

export default async function OrgDetail({ params }: { params: { id: string } }) {
  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      subscription: true,
      users: { take: 5, select: { id: true, name: true, email: true, role: true } },
      surveys: { include: { responses: true } },
      slackIntegration: true,
      hrisIntegration: true,
    },
  });
  if (!org) return <div className="text-sm text-slate-600">Not found</div>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{org.name}</h1>
        <p className="text-sm text-slate-600">Billing: per-seat · Seats: {org.subscription?.seats ?? "—"}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Usage</h2>
        <p className="text-sm text-slate-600">
          Surveys: {org.surveys.length} · Responses: {org.surveys.reduce((a: any, s: any) => a + s.responses.length, 0)}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {org.slackIntegration && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Slack</span>}
          {org.hrisIntegration && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">HRIS</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent users</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {org.users.map((u: any) => (
            <li key={u.id}>
              {u.name} ({u.email}) — {getRoleLabel(u.role)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
