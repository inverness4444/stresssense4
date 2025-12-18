import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SurveyReportWithAiPanel } from "@/components/app/SurveyReportWithAiPanel";

type Props = { params: { id: string } };

export default async function TeamStressPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const team = await prisma.team.findFirst({ where: { id: params.id, organizationId: user.organizationId } });
  if (!team) notFound();

  const history = await prisma.teamMetricsHistory.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "asc" },
    take: 8,
  });

  const timeseries =
    history.length > 0
      ? history.map((h: any) => ({ label: h.periodLabel, value: h.engagementScore ?? 0, date: h.createdAt }))
      : [
          { label: "W1", value: team.engagementScore ?? 7.0, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
          { label: "W2", value: (team.engagementScore ?? 7.0) + 0.1, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { label: "W3", value: (team.engagementScore ?? 7.0) - 0.2, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { label: "W4", value: (team.engagementScore ?? 7.0) + 0.3, date: new Date() },
        ];

  const drivers = [
    { name: "Alignment", score: 7.1, delta: 0.2 },
    { name: "Recognition", score: 6.8, delta: 0.1 },
    { name: "Workload", score: team.stressIndex ?? 6.5, delta: -0.2 },
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
        <Metric label="Stress index" value={`${(team.stressIndex ?? 0).toFixed(1)} / 10`} />
        <Metric label="Engagement" value={`${(team.engagementScore ?? 0).toFixed(1)} / 10`} />
        <Metric label="Participation" value={`${team.participation ?? 0}%`} />
      </div>

      <SurveyReportWithAiPanel
        title="Team survey report"
        subtitle="Live preview"
        score={team.engagementScore ?? 0}
        delta={0.4}
        deltaDirection="up"
        periodLabel="Last 6 weeks"
        timeseries={timeseries}
        drivers={drivers}
        periodFrom={periodFrom}
        periodTo={periodTo}
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
