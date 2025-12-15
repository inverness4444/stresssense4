import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getCompensationBands, getCompensationCycleOverviewForHr } from "@/lib/compensationOverview";
import { prisma } from "@/lib/prisma";
import { createCompensationBand, createCompensationReviewCycle } from "./actions";

export default async function HrCompensationPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app/overview");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) redirect("/app/overview");

  const { bands } = await getCompensationBands({ orgId: user.organizationId });
  const cycles = await prisma.compensationReviewCycle.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });
  const activeCycle = cycles[0];
  const overview = activeCycle
    ? await getCompensationCycleOverviewForHr({ orgId: user.organizationId, cycleId: activeCycle.id })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">HR · Compensation</p>
          <h1 className="text-2xl font-semibold text-slate-900">Compensation hub</h1>
          <p className="text-sm text-slate-600">Manage pay bands and review cycles.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="#create-cycle"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            New cycle
          </Link>
          <Link
            href="#create-band"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            New band
          </Link>
        </div>
      </div>

      {activeCycle && overview ? (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{activeCycle.key}</p>
              <h2 className="text-lg font-semibold text-slate-900">{activeCycle.title}</h2>
              <p className="text-sm text-slate-600">{activeCycle.status}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                Participants: {overview.aggregates.totalParticipants}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                Avg increase: {(overview.aggregates.avgIncreasePct * 100).toFixed(1)}%
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                Out of range: {overview.aggregates.outOfRangeCount}
              </span>
            </div>
          </div>
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Employee</th>
                  <th className="px-4 py-2 text-left font-semibold">Manager</th>
                  <th className="px-4 py-2 text-left font-semibold">Band</th>
                  <th className="px-4 py-2 text-left font-semibold">Current base</th>
                  <th className="px-4 py-2 text-left font-semibold">Proposed</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.participants.map(({ participant, recommendation }) => (
                  <tr key={participant.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-medium text-slate-900">{participant.user.name}</td>
                    <td className="px-4 py-2 text-slate-700">{participant.manager?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-700">{participant.currentBand?.key ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {participant.currentBase ? `${participant.currentBase} ${activeCycle.currency}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {recommendation?.proposedBase
                        ? `${recommendation.proposedBase} ${activeCycle.currency}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {recommendation?.status ?? "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
          Нет активного цикла. Создайте новый цикл ниже.
        </div>
      )}

      <div id="create-cycle" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Create cycle</h3>
        <form action={createCompensationReviewCycle} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="organizationId" value={user.organizationId} />
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Key</span>
            <input name="key" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Title</span>
            <input name="title" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Currency</span>
            <input name="currency" defaultValue="USD" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Period start</span>
            <input type="date" name="periodStart" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Period end</span>
            <input type="date" name="periodEnd" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-800">Description</span>
            <textarea name="description" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              Create cycle
            </button>
          </div>
        </form>
      </div>

      <div id="create-band" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Create band</h3>
        <form action={createCompensationBand} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Key</span>
            <input name="key" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Title</span>
            <input name="title" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Currency</span>
            <input name="currency" defaultValue="USD" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Min base</span>
            <input name="minBase" type="number" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Mid base</span>
            <input name="midBase" type="number" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Max base</span>
            <input name="maxBase" type="number" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Job family</span>
            <input name="jobFamily" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Level</span>
            <input name="level" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-slate-800">Description</span>
            <textarea name="description" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <div className="sm:col-span-3">
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              Create band
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
