import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureOrgSettings } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/stressMetrics";
import { MessageDraft } from "@/components/app/MessageDraft";
import { getRecommendationsForContext } from "@/lib/recommendations";

type Props = { params: { id: string } };

export default async function TeamStressPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const team = await prisma.team.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: { users: true },
  });
  if (!team) notFound();

  const isManager = user.role === "MANAGER";
  if (isManager) {
    const member = await prisma.userTeam.findFirst({ where: { userId: user.id, teamId: team.id } });
    if (!member) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">You don&apos;t have access to this team.</p>
        </div>
      );
    }
  }

  const settings = await ensureOrgSettings(user.organizationId);

  const risk = await prisma.teamRiskSnapshot.findFirst({
    where: { organizationId: user.organizationId, teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  const recommendations = await getRecommendationsForContext({
    orgId: user.organizationId,
    teamId: team.id,
    riskDrivers: Array.isArray(risk?.drivers) ? (risk?.drivers as any[]).map((d: any) => d.key ?? "").filter(Boolean) : [],
    anomalyMetrics: [],
    role: user.role === "ADMIN" ? "HR" : "MANAGER",
  });

  const surveys = await prisma.survey.findMany({
    where: {
      organizationId: user.organizationId,
      targets: { some: { teamId: team.id } },
    },
    include: {
      inviteTokens: { include: { user: { include: { teams: true } } } },
      responses: {
        include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = surveys.map((survey) => {
    const teamInvites = survey.inviteTokens.filter((i) => i.user.teams.some((t) => t.teamId === team.id));
    const teamResponses = survey.responses.filter((r) => r.inviteToken.user.teams.some((t) => t.teamId === team.id));
    const participation = teamInvites.length ? Math.round((teamResponses.length / teamInvites.length) * 100) : 0;
    let sum = 0;
    let count = 0;
    teamResponses.forEach((r) => {
      r.answers.forEach((a) => {
        if (a.scaleValue != null) {
          sum += a.scaleValue;
          count += 1;
        }
      });
    });
    const stressIndex = count ? normalize(sum / count, settings.stressScaleMin, settings.stressScaleMax) : 0;
    const status = stressIndex >= 70 ? "High" : stressIndex >= 40 ? "Moderate" : "Healthy";
    const enough = teamResponses.length >= (survey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown);
    return {
      survey,
      participation,
      stressIndex: enough ? stressIndex : null,
      responses: teamResponses.length,
      status,
      date: survey.startsAt ?? survey.createdAt,
      enough,
    };
  });

  const latest = rows[rows.length - 1];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{team.name} stress over time</h2>
        <p className="text-sm text-slate-600">Stress trends over time for this team.</p>
        {risk && <RiskBadge risk={risk} />}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Latest stress index" value={latest?.stressIndex != null ? `${latest.stressIndex}` : "Not enough data"} />
        <Metric label="Latest participation" value={latest ? `${latest.participation}%` : "—"} />
        <Metric label="Surveys included" value={`${rows.length}`} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Trend</h3>
        <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-2">
          {rows.map((row) => (
            <div key={row.survey.id} className="flex flex-col items-center gap-2">
              <div className="flex h-32 w-10 items-end justify-center rounded-full bg-slate-100">
                <div
                  className="w-10 rounded-full bg-gradient-to-t from-primary/40 to-primary"
                  style={{ height: `${row.stressIndex ?? 0}%` }}
                  title={row.enough ? `${row.stressIndex}` : "Hidden"}
                />
              </div>
              <p className="text-[10px] text-center text-slate-600">{new Date(row.date).toLocaleDateString()}</p>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-slate-600">No surveys yet.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Survey history for this team</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Name", "Date", "Participation", "Stress index", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.survey.id} className="text-sm">
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.survey.name}</td>
                  <td className="px-3 py-2 text-slate-700">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-slate-700">{row.participation}%</td>
                  <td className="px-3 py-2 text-slate-700">{row.stressIndex != null ? row.stressIndex : "Not enough responses"}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-600">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recommended actions</h3>
              <p className="text-sm text-slate-600">Based on recent signals for this team.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{rec.key}</p>
                <h4 className="mt-1 text-base font-semibold text-slate-900">{rec.title}</h4>
                {rec.description && <p className="mt-1 text-sm text-slate-700">{rec.description}</p>}
                {Array.isArray(rec.suggestedActions) && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {(rec.suggestedActions as any[]).slice(0, 4).map((a, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{typeof a === "string" ? a : a.title ?? JSON.stringify(a)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <MessageDraft teamId={team.id} />
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

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    High: "bg-rose-50 text-rose-700 ring-rose-100",
    Moderate: "bg-amber-50 text-amber-700 ring-amber-100",
    Healthy: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };
  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${colors[status] ?? ""}`}>{status}</span>;
}

function RiskBadge({ risk }: { risk: { stressLevel: string; riskScore: number; drivers?: any } }) {
  const map: Record<string, { text: string; className: string }> = {
    low: { text: "Low risk", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
    medium: { text: "Medium risk", className: "bg-amber-50 text-amber-700 ring-amber-100" },
    high: { text: "High risk", className: "bg-orange-50 text-orange-700 ring-orange-100" },
    critical: { text: "Critical risk", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  };
  const styles = map[risk.stressLevel] ?? map.low;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles.className}`}>
        {styles.text} · {risk.riskScore}
      </span>
      <span className="text-xs text-slate-500">Based on last 30 days</span>
    </div>
  );
}
