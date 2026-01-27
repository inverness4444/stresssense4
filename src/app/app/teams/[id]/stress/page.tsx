import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SurveyReportWithAiPanel } from "@/components/app/SurveyReportWithAiPanel";
import { getDisplayStressIndex, getEngagementFromParticipation } from "@/lib/metricDisplay";
import { getBillingGateStatus } from "@/lib/billingGate";
import { env } from "@/config/env";

type Props = { params: { id: string } };

export const dynamic = "force-dynamic";

export default async function TeamStressPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const resolvedParams = await Promise.resolve(params);
  const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;
  const teamId = typeof rawId === "string" ? decodeURIComponent(rawId).trim() : "";
  if (!teamId) notFound();

  const team = await prisma.team.findFirst({ where: { id: teamId, organizationId: user.organizationId } });
  if (!team) notFound();

  const orgCreatedAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : new Date();
  const gateStatus = await getBillingGateStatus(user.organizationId, orgCreatedAt, { userRole: user.role });
  const aiEnabled = gateStatus.hasPaidAccess || env.isDev;

  const history = await prisma.teamMetricsHistory.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "asc" },
    take: 8,
  });

  const displayStress = getDisplayStressIndex(team.stressIndex, team.engagementScore) ?? 0;
  const displayEngagement = getEngagementFromParticipation(team.participation, team.engagementScore) ?? 0;

  const timeseries =
    history.length > 0
      ? history.map((h: any) => ({
          label: h.periodLabel,
          value: getDisplayStressIndex(h.stressIndex, h.engagementScore) ?? 0,
          date: h.createdAt,
        }))
      : [
          { label: "W1", value: displayStress, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
          { label: "W2", value: displayStress + 0.1, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { label: "W3", value: Math.max(0, displayStress - 0.2), date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { label: "W4", value: displayStress + 0.3, date: new Date() },
        ];

  const drivers = [
    { name: "Alignment", score: 7.1, delta: 0.2 },
    { name: "Recognition", score: 6.8, delta: 0.1 },
    { name: "Workload", score: displayStress, delta: -0.2 },
  ];
  const firstDate = timeseries[0]?.date ? new Date(timeseries[0].date) : new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const lastDate = timeseries[timeseries.length - 1]?.date ? new Date(timeseries[timeseries.length - 1].date) : new Date();
  const periodFrom = firstDate.toISOString().slice(0, 10);
  const periodTo = lastDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{team.name} stress</h2>
        <p className="text-sm text-slate-600">Aggregated metrics for this team.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Stress index" value={`${displayStress.toFixed(1)} / 10`} />
        <Metric label="Engagement" value={`${displayEngagement.toFixed(1)} / 10`} />
        <Metric label="Participation" value={`${Math.round(team.participation ?? 0)}%`} />
      </div>

      <SurveyReportWithAiPanel
        title="Team survey report"
        subtitle="Live preview"
        score={displayStress}
        delta={0.4}
        deltaDirection="up"
        periodLabel="Last 6 weeks"
        timeseries={timeseries}
        drivers={drivers}
        reportContext={{ scope: "team", scopeId: team.id, dateRange: { from: periodFrom, to: periodTo } }}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
