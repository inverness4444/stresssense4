import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";
import { normalize } from "@/lib/stressMetrics";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getAccessibleUserIdsForManager } from "@/lib/managerAccess";
import { trackEvent } from "@/lib/analyticsClient";
import { NpsWidget } from "@/components/app/NpsWidget";
import { SurveyEngagementCard } from "@/components/app/SurveyEngagementCard";
import { redirect } from "next/navigation";

export default async function OverviewPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in to view the workspace.</p>
      </div>
    );
  }
  if (user.role === "EMPLOYEE") {
    redirect("/app/my/home");
  }
  if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "HR") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">You don&apos;t have access to this area.</p>
      </div>
    );
  }

  const settings = await ensureOrgSettings(user.organizationId);
  if (user.role === "MANAGER" && !settings.allowManagerAccessToAllSurveys) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">You don&apos;t have access to this area.</p>
      </div>
    );
  }
  const teamIds = (
    await prisma.userTeam.findMany({ where: { userId: user.id }, select: { teamId: true } })
  ).map((t) => t.teamId);
  const onboarding = await getOnboardingStatus(user.organizationId);
  const onboardingComplete = onboarding.hasTeams && onboarding.hasEmployees && onboarding.hasSurveys;
  // Fire page_view asynchronously
  trackEvent("page_view", "web_app", { page: "overview" });

  const baseSurveyWhere =
    user.role === "ADMIN"
      ? { organizationId: user.organizationId }
      : {
          organizationId: user.organizationId,
          targets: { some: { teamId: { in: teamIds } } },
        };
  const accessibleUserIds = user.role === "MANAGER" ? await getAccessibleUserIdsForManager(user.id, user.organizationId) : undefined;
  const segmentType = (searchParams?.segment as string) ?? "department";

  const orgRisk = await prisma.orgRiskSnapshot.findFirst({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const anomalies = await prisma.anomalyEvent.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const latestSurvey = await prisma.survey.findFirst({
    where: baseSurveyWhere,
    include: {
      inviteTokens: { include: { user: { include: { teams: true } } } },
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      targets: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const activeSurveys = await prisma.survey.count({
    where: { ...baseSurveyWhere, status: "ACTIVE" },
  });

  const recentSurveys = await prisma.survey.findMany({
    where: baseSurveyWhere,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { inviteTokens: true, responses: true, targets: true },
  });

  const participation = (() => {
    if (!latestSurvey) return 0;
    const invites = user.role === "ADMIN"
      ? latestSurvey.inviteTokens.length
      : latestSurvey.inviteTokens.filter((i) => accessibleUserIds?.includes(i.userId) ?? false).length;
    const responses =
      user.role === "ADMIN"
        ? latestSurvey.responses.length
        : latestSurvey.responses.filter((r) => accessibleUserIds?.includes(r.inviteToken.userId) ?? false).length;
    return invites ? Math.round((responses / invites) * 100) : 0;
  })();

  const stressAvg = (() => {
    if (!latestSurvey) return 0;
    const relevantResponses =
      user.role === "ADMIN"
        ? latestSurvey.responses
        : latestSurvey.responses.filter((r) => accessibleUserIds?.includes(r.inviteToken.userId) ?? false);
    let sum = 0;
    let count = 0;
    relevantResponses.forEach((r) => {
      r.answers.forEach((a) => {
        if (a.scaleValue != null) {
          sum += a.scaleValue;
          count += 1;
        }
      });
    });
    return count === 0 ? 0 : normalize(sum / count, settings.stressScaleMin, settings.stressScaleMax);
  })();

  return (
    <div className="space-y-6">
      {user.role === "ADMIN" && !onboardingComplete && (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Workspace setup</p>
              <p className="text-lg font-semibold text-amber-900">Let&apos;s get your first stress pulse ready</p>
              <p className="text-sm text-amber-800">Complete these steps to unlock dashboards.</p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
              {Number(onboarding.hasTeams) + Number(onboarding.hasEmployees) + Number(onboarding.hasSurveys)}/3
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <OnboardingStep done={onboarding.hasTeams} label="Name your first teams" href="/app/teams" />
            <OnboardingStep done={onboarding.hasEmployees} label="Add people" href="/app/employees" />
            <OnboardingStep done={onboarding.hasSurveys} label="Run your first stress pulse" href="/app/surveys/new" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          {user.role === "MANAGER" ? "My teams stress overview" : "Stress overview"}
        </h2>
        <p className="text-sm text-slate-600">
          {user.role === "MANAGER"
            ? "A snapshot of how your teams are feeling right now."
            : "Quick snapshot of your StressSense workspace."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Average stress index" value={`${stressAvg}`} />
        <Metric label="Participation rate" value={`${participation}%`} />
        <Metric label="Active surveys" value={`${activeSurveys}`} />
      </div>

      <SurveyEngagementCard orgId={user.organizationId} />

      {orgRisk && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Risk overview</p>
              <h3 className="text-lg font-semibold text-slate-900">Organization risk level</h3>
              <p className="text-sm text-slate-600">Based on the last 30 days of survey data.</p>
            </div>
            <InlineRiskBadge level={orgRisk.stressLevel} score={orgRisk.riskScore} />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Segments</h3>
          <form method="get" className="flex items-center gap-2 text-sm">
            <label className="text-slate-600">Segment by</label>
            <select
              name="segment"
              defaultValue={segmentType}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="department">Department</option>
              <option value="location">Location</option>
            </select>
            <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
              Apply
            </button>
          </form>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">
            Top 5 segments by stress index (last survey). Managers see only their accessible users.
          </p>
          <SegmentTable
            latestSurvey={latestSurvey}
            segmentType={(segmentType as "department" | "location") ?? "department"}
            accessibleUserIds={accessibleUserIds}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recent surveys</h3>
        <div className="mt-3 space-y-3">
          {recentSurveys.map((survey) => {
            const part =
              survey.inviteTokens.length === 0
                ? 0
                : Math.round((survey.responses.length / survey.inviteTokens.length) * 100);
            return (
              <div
                key={survey.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{survey.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(survey.createdAt).toLocaleDateString()} · {survey.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">{part}%</span>
                  <a href={`/app/surveys/${survey.id}`} className="text-sm font-semibold text-primary hover:underline">
                    View
                  </a>
                </div>
              </div>
            );
          })}
          {recentSurveys.length === 0 && <p className="text-sm text-slate-600">No surveys yet.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent changes</h3>
            <p className="text-sm text-slate-600">Significant shifts detected in stress or participation.</p>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {anomalies.length === 0 && <p className="text-sm text-slate-600">No notable changes detected.</p>}
          {anomalies.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {a.metric === "stress_index" ? "Stress index" : "Participation"} {a.changeDirection === "up" ? "increased" : "decreased"} by{" "}
                  {(Math.abs(a.changeMagnitude) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">
                  Scope: {a.scopeType} {a.scopeId ?? "org"} · Severity {a.severity}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Tell us how we’re doing</h3>
        <p className="text-sm text-slate-600">Quick NPS check to improve StressSense.</p>
        <NpsWidget surveyId="nps_default" />
      </section>
    </div>
  );
}

function SegmentTable({
  latestSurvey,
  segmentType,
  accessibleUserIds,
}: {
  latestSurvey: any;
  segmentType: "department" | "location";
  accessibleUserIds?: string[];
}) {
  if (!latestSurvey) return <p className="text-sm text-slate-600">No survey data yet.</p>;
  const responses = latestSurvey.responses.filter((r: any) =>
    accessibleUserIds?.length ? accessibleUserIds.includes(r.inviteToken.userId) : true
  );
  const map = new Map<string, { sum: number; count: number }>();
  responses.forEach((r: any) => {
    const key =
      segmentType === "department" ? r.inviteToken.user.department ?? "Unspecified" : r.inviteToken.user.location ?? "Unspecified";
    r.answers.forEach((a: any) => {
      if (a.scaleValue != null) {
        const entry = map.get(key) ?? { sum: 0, count: 0 };
        entry.sum += a.scaleValue;
        entry.count += 1;
        map.set(key, entry);
      }
    });
  });
  const rows = Array.from(map.entries())
    .map(([key, val]) => ({
      key,
      index: val.count ? normalize(val.sum / val.count, 1, 5) : 0,
      count: val.count,
    }))
    .sort((a, b) => b.index - a.index)
    .slice(0, 5);

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{segmentType}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stress index</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Responses</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-2 font-semibold text-slate-900">{row.key}</td>
              <td className="px-3 py-2 text-slate-700">{row.index}</td>
              <td className="px-3 py-2 text-slate-700">{row.count}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-sm text-slate-600">
                No segment data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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

function OnboardingStep({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <a
      href={href}
      className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
        done
          ? "border-emerald-100 bg-white text-emerald-700"
          : "border-amber-100 bg-amber-50 text-amber-900 hover:border-amber-200"
      }`}
    >
      <span>{label}</span>
      <span className={`h-3 w-3 rounded-full ${done ? "bg-emerald-500" : "bg-amber-400"}`} />
    </a>
  );
}

function InlineRiskBadge({ level, score }: { level: string; score: number }) {
  const map: Record<string, { text: string; className: string }> = {
    low: { text: "Low risk", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
    medium: { text: "Medium risk", className: "bg-amber-50 text-amber-700 ring-amber-100" },
    high: { text: "High risk", className: "bg-orange-50 text-orange-700 ring-orange-100" },
    critical: { text: "Critical risk", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  };
  const styles = map[level] ?? map.low;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles.className}`}>
      {styles.text} · {score}
    </span>
  );
}
