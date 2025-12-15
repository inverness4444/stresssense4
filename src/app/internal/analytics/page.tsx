import { prisma } from "@/lib/prisma";

const ranges: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export default async function InternalAnalytics({ searchParams }: { searchParams?: Record<string, string> }) {
  const rangeKey = searchParams?.range ?? "7d";
  const days = ranges[rangeKey] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.productEvent.groupBy({
    by: ["eventName"],
    _count: { _all: true },
    where: { createdAt: { gte: since } },
    orderBy: { _count: { eventName: "desc" } },
    take: 10,
  });
  const experiments = await prisma.experiment.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: { assignments: true },
  });
  const topOrgs = await prisma.organization.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      surveys: { include: { responses: true } },
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Product analytics</h1>
        <p className="text-sm text-slate-600">Event volumes and active workspaces (internal view).</p>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Top events</h2>
          <form className="text-sm">
            <select
              name="range"
              defaultValue={rangeKey}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="90d">Last 90d</option>
            </select>
            <button className="ml-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">Apply</button>
          </form>
        </div>
        <div className="mt-3 space-y-2">
          {events.map((e) => (
            <div key={e.eventName} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-900">{e.eventName}</span>
              <span className="text-slate-600">{e._count._all}</span>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-slate-600">No events yet.</p>}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Experiments</h2>
        <div className="mt-3 space-y-3">
          {experiments.map((exp) => {
            const byVariant = exp.assignments.reduce<Record<string, number>>((acc, a) => {
              acc[a.variantKey] = (acc[a.variantKey] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <div key={exp.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{exp.key}</p>
                    <p className="text-xs text-slate-500">Status: {exp.status} · Target metric: {exp.targetMetric}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{exp.scope}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
                  {Object.entries(byVariant).map(([k, v]) => (
                    <span key={k} className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                      {k}: {v} exposures
                    </span>
                  ))}
                  {exp.assignments.length === 0 && <span className="text-slate-500">No assignments yet.</span>}
                </div>
              </div>
            );
          })}
          {experiments.length === 0 && <p className="text-sm text-slate-600">No experiments configured.</p>}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Top active workspaces</h2>
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {topOrgs.map((org) => (
            <div key={org.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{org.name}</p>
                <p className="text-xs text-slate-500">
                  Plan: {org.subscription?.plan?.name ?? "Free"} · Surveys: {org.surveys.length} · Responses:{" "}
                  {org.surveys.reduce((acc, s) => acc + s.responses.length, 0)}
                </p>
              </div>
              <a href={`/internal/organizations/${org.id}`} className="text-primary hover:underline">
                View
              </a>
            </div>
          ))}
          {topOrgs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No organizations.</p>}
        </div>
      </section>
    </div>
  );
}
