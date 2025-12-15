import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getCompensationOverviewForManager } from "@/lib/compensationOverview";
import { prisma } from "@/lib/prisma";
import { upsertCompRecommendation, requestCompAiSuggestion } from "./actions";

export default async function ManagerCompensationPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "MANAGER" && user.role !== "ADMIN")) redirect("/app/overview");
  const enabled = await isFeatureEnabled("compensation_module_v1", { organizationId: user.organizationId });
  if (!enabled) redirect("/app/overview");

  const cycle = await prisma.compensationReviewCycle.findFirst({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });
  if (!cycle) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
        Нет активных компенсационных циклов.
      </div>
    );
  }

  const overview = await getCompensationOverviewForManager({
    orgId: user.organizationId,
    cycleId: cycle.id,
    managerId: user.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Compensation</p>
          <h1 className="text-2xl font-semibold text-slate-900">Review for your team</h1>
          <p className="text-sm text-slate-600">{cycle.title}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
            Participants: {overview.myParticipants.length}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
            Avg increase: {(overview.budgetSummary.avgIncreasePct * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="overflow-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Employee</th>
              <th className="px-4 py-2 text-left font-semibold">Current band</th>
              <th className="px-4 py-2 text-left font-semibold">Current base</th>
              <th className="px-4 py-2 text-left font-semibold">Position in band</th>
              <th className="px-4 py-2 text-left font-semibold">Proposed</th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {overview.myParticipants.map(({ participant, recommendation, bandPosition }) => (
              <tr key={participant.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-semibold text-slate-900">{participant.user.name}</td>
                <td className="px-4 py-3 text-slate-700">{participant.currentBand?.key ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {participant.currentBase ? `${participant.currentBase} ${cycle.currency}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {bandPosition.label ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {bandPosition.label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {recommendation?.proposedBase
                    ? `${recommendation.proposedBase} ${cycle.currency}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">{recommendation?.status ?? "draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simple inline form for first participant as MVP */}
      {overview.myParticipants[0] && (
        <CompForm cycleId={cycle.id} participantId={overview.myParticipants[0].participant.id} />
      )}
    </div>
  );
}

function CompForm({ cycleId, participantId }: { cycleId: string; participantId: string }) {
  return (
    <form action={upsertCompRecommendation} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Edit recommendation</h3>
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="participantId" value={participantId} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-slate-800">Proposed base</span>
          <input name="proposedBase" type="number" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-slate-800">Proposed bonus %</span>
          <input name="proposedBonusPct" type="number" step="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-slate-800">Rationale</span>
          <input name="rationale" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
          Save
        </button>
      </div>
    </form>
  );
}
