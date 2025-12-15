import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeSurvey, sendInvites, sendReminders, sendSlackInvites, createKioskSession, deactivateKioskSession } from "../actions";
import { getSurveyWithMetrics } from "@/lib/surveys";
import { ensureOrgSettings } from "@/lib/access";
import { isFeatureEnabled } from "@/lib/features";
import { env } from "@/config/env";
import { generateSurveyInsight } from "@/lib/surveyInsights";
import { getAccessibleUserIdsForManager } from "@/lib/managerAccess";
import { filterResponsesBySegments } from "@/lib/segments";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Props = { params: { id: string }; searchParams?: Record<string, string | string[] | undefined> };

export default async function SurveyDashboardPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER";

  const teamIds = (
    await prisma.userTeam.findMany({ where: { userId: user.id }, select: { teamId: true } })
  ).map((t) => t.teamId);

  const settings = await ensureOrgSettings(user.organizationId);

  const surveyTargets = await prisma.survey.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    select: { targets: { select: { teamId: true } }, minResponsesForBreakdown: true },
  });
  if (!surveyTargets) notFound();

  if (isManager) {
    if (!settings.allowManagerAccessToAllSurveys) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">You don&apos;t have access to this survey.</p>
        </div>
      );
    }
    const overlap = surveyTargets.targets.some((t) => teamIds.includes(t.teamId));
    if (!overlap) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">You don&apos;t have access to this survey.</p>
        </div>
      );
    }
  }

  const accessibleUserIds = isManager ? await getAccessibleUserIdsForManager(user.id, user.organizationId) : undefined;

  const filter = buildFilter(searchParams);
  const filterOptions = await getFilterOptions(params.id, user.organizationId, accessibleUserIds);
  const filteredUserIds = await getUserIdsForFilter(params.id, user.organizationId, filter, accessibleUserIds);
  const surveyData = await getSurveyWithMetrics(
    params.id,
    user.organizationId,
    {
      allowedTeamIds: isAdmin ? undefined : teamIds,
      allowedUserIds: isAdmin ? undefined : filteredUserIds ?? accessibleUserIds,
      scaleMin: settings.stressScaleMin,
      scaleMax: settings.stressScaleMax,
      minResponses: surveyTargets.minResponsesForBreakdown ?? settings.minResponsesForBreakdown,
    }
  );
  if (!surveyData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Survey not found.</p>
      </div>
    );
  }

  const { survey, stats, questionBreakdown, teamBreakdown } = surveyData;
  const minBreakdown = survey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown;
  const overlap = survey.targets.some((t: any) => teamIds.includes(t.teamId));
  const canExport = isAdmin || (isManager && overlap && settings.allowManagerAccessToAllSurveys);
  const aiSummaryEnabled = isFeatureEnabled("aiSummary", settings);
  let insight = null;
  if (aiSummaryEnabled && env.AI_PROVIDER !== "none") {
    try {
      insight = await generateSurveyInsight(survey.id);
    } catch (e) {
      console.warn("AI summary generation failed", e);
    }
  }

  const totalTargets = survey.targets.length;
  const totalInvitees = await prisma.surveyInviteToken.count({ where: { surveyId: survey.id } });
  const pendingInvites = survey.inviteTokens.filter((i: any) => !i.usedAt).length;
  const emailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
  const slackConnected = await prisma.slackIntegration.findUnique({ where: { organizationId: user.organizationId } });
  const kiosks = await prisma.kioskSession.findMany({
    where: { surveyId: survey.id, organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });
  const variantStats = survey.inviteTokens.reduce((acc: Record<string, { invites: number; responses: number }>, t: any) => {
    const key = t.variantKey || "A";
    acc[key] = acc[key] || { invites: 0, responses: 0 };
    acc[key].invites += 1;
    if (t.usedAt) acc[key].responses += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/app/surveys" className="text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:underline">
            Back to surveys
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">{survey.name}</h2>
            <StatusBadge status={survey.status} />
          </div>
          <p className="text-sm text-slate-600">
            {survey.startsAt ? `Launched on ${new Date(survey.startsAt).toLocaleDateString()}` : "Ongoing"}{" "}
            {survey.endsAt ? ` · Ends ${new Date(survey.endsAt).toLocaleDateString()}` : ""}
          </p>
          <p className="text-xs text-slate-600">
            Targeting {totalTargets} team{totalTargets === 1 ? "" : "s"} · {totalInvitees} people invited
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              {survey.invitesSentAt ? (
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  Invites sent {new Date(survey.invitesSentAt).toLocaleDateString()}
                </div>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await sendInvites(survey.id);
                  }}
                >
                  <button className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:shadow-lg">
                    Send invites
                  </button>
                </form>
              )}
              {survey.invitesSentAt && pendingInvites > 0 && (
                <form
                  action={async () => {
                    "use server";
                    await sendReminders(survey.id);
                  }}
                >
                  <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                    Remind people who haven&apos;t answered
                  </button>
                </form>
              )}
            </>
          )}
          {isAdmin && slackConnected && (
            <form
              action={async () => {
                "use server";
                await sendSlackInvites(survey.id);
              }}
            >
              <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                Отправить в Slack
              </button>
            </form>
          )}
          {isAdmin && survey.status === "ACTIVE" && (
            <form
              action={async () => {
                "use server";
                await closeSurvey(survey.id);
              }}
            >
              <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                Close survey
              </button>
            </form>
          )}
          {canExport && (
            <a
              href={`/app/api/surveys/${survey.id}/export`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Export CSV
            </a>
          )}
        </div>
      </div>
      {isAdmin && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Kiosk mode</p>
              <h3 className="text-lg font-semibold text-slate-900">On-site / tablet survey links</h3>
              <p className="text-sm text-slate-600">Generate a kiosk link for in-office tablets. Responses are anonymous.</p>
            </div>
            <form
              action={async (formData) => {
                "use server";
                await createKioskSession(survey.id, formData.get("kioskName") as string);
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                name="kioskName"
                placeholder="Front desk kiosk"
                className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:shadow-lg">
                Create kiosk link
              </button>
            </form>
          </div>
          <div className="mt-4 space-y-2">
            {kiosks.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{k.name || "Kiosk"}</p>
                    <p className="text-xs text-slate-500">
                      URL: {`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/kiosk/${k.id}`} · {k.isActive ? "Active" : "Disabled"}
                    </p>
                    {k.lastUsedAt && <p className="text-[11px] text-slate-500">Last used {new Date(k.lastUsedAt).toLocaleString()}</p>}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
                    Copy URL for QR: {`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/kiosk/${k.id}`}
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deactivateKioskSession(k.id);
                  }}
                >
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
                    disabled={!k.isActive}
                  >
                    Deactivate
                  </button>
                </form>
              </div>
            ))}
            {kiosks.length === 0 && <p className="text-sm text-slate-600">No kiosk links yet.</p>}
          </div>
        </section>
      )}
      <FilterPanel surveyId={survey.id} organizationId={user.organizationId} activeFilter={filter} options={filterOptions} />

      {isAdmin && !emailConfigured && (
        <p className="text-sm text-amber-700">
          Email is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD) — invites will be skipped until configured.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Participation" value={`${stats.participation}%`} helper={`${stats.responsesCount} of ${stats.inviteCount}`} />
        <MetricCard label="Average stress index" value={`${stats.averageStressIndex}`} helper="0-100 scale" />
        <MetricCard label="Responses" value={`${stats.responsesCount}`} />
        <MetricCard label="Teams included" value={`${survey.targets.length}`} />
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Email performance (A/B)</h3>
        <p className="text-xs text-slate-500">Response rate by variant.</p>
        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {Object.entries(variantStats).map(([key, v]: [string, any]) => {
            const rate = v.invites ? Math.round((v.responses / v.invites) * 100) : 0;
            return (
              <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">Variant {key}</span>
                <span className="text-slate-700">
                  {v.responses}/{v.invites} ({rate}%)
                </span>
              </div>
            );
          })}
          {Object.keys(variantStats).length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No invites sent yet.</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">AI summary</p>
              <h3 className="text-lg font-semibold text-slate-900">What&apos;s going on</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Experimental</span>
          </div>
          {env.AI_PROVIDER === "none" && <p className="text-sm text-slate-600">AI summaries are disabled in this environment.</p>}
          {env.AI_PROVIDER !== "none" && (
            <>
              {!insight && <p className="text-sm text-slate-600">Thinking about your results…</p>}
      {insight && (
        <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      Sentiment
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {insight.sentimentLabel ?? "mixed"}
                    </span>
                    <span className="text-xs text-slate-500">Last generated {insight.lastGeneratedAt.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    {insight.summaryText.split("\n").map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                  {insight.themes && Array.isArray(insight.themes) && (insight.themes as any[]).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Key themes</p>
                      <div className="space-y-2">
                        {(insight.themes as any[]).map((t: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{t.name}</span>
                              <span className="text-xs text-slate-600">{Math.round((t.share ?? 0) * 100)}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full bg-primary/70"
                                style={{ width: `${Math.min(100, Math.round((t.share ?? 0) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {insight.managerSuggestions && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What managers can do next</p>
                      <ul className="space-y-2 text-sm text-slate-700">
                        {insight.managerSuggestions.split("\n").map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                              {idx + 1}
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {isAdmin && (
                    <form
                      action={async () => {
                        "use server";
                        await generateSurveyInsight(survey.id, { force: true });
                      }}
                    >
                      <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                        Regenerate insight
                      </button>
                    </form>
                  )}
                  <a href="/privacy#ai" className="text-xs font-semibold text-primary hover:underline">
                    Learn how AI is used
                  </a>
                </div>
              )}
            </>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Breakdown by question</h3>
          <div className="space-y-4">
            {questionBreakdown.map((qb: any) =>
              qb.question.type === "SCALE" ? (
                <div key={qb.question.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{qb.question.text}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Avg {qb.average?.toFixed(1) ?? "—"} · Index {qb.stressIndex ?? 0}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {Object.entries(qb.counts ?? {}).map(([value, count]: [string, any]) => {
                      const total = Object.values(qb.counts ?? {}).reduce((a: any, b: any) => a + b, 0) || 1;
                      const width = Math.round(((count as unknown as number) / (total as number)) * 100);
                      return (
                        <div key={value} className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="w-6 font-semibold">{value}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-primary/70" style={{ width: `${width}%` }} />
                          </div>
                          <span className="w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div key={qb.question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{qb.question.text}</p>
                  <div className="mt-3 space-y-2">
                    {(qb.comments ?? []).length === 0 && (
                      <p className="text-xs text-slate-500">No comments yet.</p>
                    )}
                    {(qb.comments ?? []).map((c: any, idx: number) => (
                      <div key={idx} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        {c.text}
                      </div>
                    ))}
                  </div>
                  {aiSummaryEnabled && (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Coming soon</span>
                        <p className="text-sm font-semibold text-slate-900">Summary (beta)</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        The majority of comments mention workload and unclear priorities. Some employees appreciate team support, but
                        several highlight difficulty disconnecting after hours.
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Breakdown by team</h3>
          <div className="space-y-3">
            {teamBreakdown.map((tb: any) => {
              const safe = tb.responses >= minBreakdown;
              return (
                <div key={tb.team.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tb.team.name}</p>
                    <p className="text-xs text-slate-600">
                        {safe ? `${tb.responses} responses · ${tb.participation}% participation` : "Not enough responses"}
                      </p>
                    </div>
                    {safe ? <StatusPill status={tb.status} /> : <span className="text-xs text-slate-500">—</span>}
                  </div>
                  {safe && (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                      <span>Stress index</span>
                      <span className="font-semibold">{tb.stressIndex}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {teamBreakdown.length === 0 && (
              <p className="text-sm text-slate-600">No teams targeted.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterPanel({
  surveyId,
  organizationId,
  activeFilter,
  options,
}: {
  surveyId: string;
  organizationId: string;
  activeFilter: ReturnType<typeof buildFilter>;
  options: { departments: string[]; locations: string[]; managers: { id: string; name: string }[] };
}) {
  const deps = options.departments;
  const locs = options.locations;
  const managers = options.managers;
  return (
    <form className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" method="get">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Filters</p>
          <p className="text-sm text-slate-600">Segment results by attributes.</p>
        </div>
        <button
          type="submit"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Apply
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <select
          name="department"
          defaultValue={activeFilter.selected.department ?? ""}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All departments</option>
          {deps.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          name="location"
          defaultValue={activeFilter.selected.location ?? ""}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All locations</option>
          {locs.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          name="managerId"
          defaultValue={activeFilter.selected.managerId ?? ""}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2">
        <a href={`/app/surveys/${surveyId}`} className="text-xs font-semibold text-primary hover:underline">
          Clear filters
        </a>
      </div>
    </form>
  );
}

async function getUserIdsForFilter(
  surveyId: string,
  orgId: string,
  filter: ReturnType<typeof buildFilter>,
  accessible?: string[]
) {
  const responses = await filterResponsesBySegments(surveyId, orgId, filter.selected);
  let ids = responses.map((r) => r.inviteToken.userId);
  if (accessible?.length) {
    ids = ids.filter((id) => accessible.includes(id));
  }
  return Array.from(new Set(ids));
}

async function getFilterOptions(surveyId: string, orgId: string, accessible?: string[]) {
  const tokens = await prisma.surveyInviteToken.findMany({
    where: { surveyId, survey: { organizationId: orgId } },
    include: { user: true },
  });
  const filtered = accessible?.length ? tokens.filter((t) => accessible.includes(t.userId)) : tokens;
  const departments = Array.from(new Set(filtered.map((t) => t.user.department).filter(Boolean) as string[]));
  const locations = Array.from(new Set(filtered.map((t) => t.user.location).filter(Boolean) as string[]));
  const managerIds = Array.from(new Set(filtered.map((t) => t.user.managerId).filter(Boolean) as string[]));
  const managers =
    managerIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: managerIds } }, select: { id: true, name: true } })
      : [];
  return { departments, locations, managers };
}

function buildFilter(searchParams?: Record<string, string | string[] | undefined>) {
  const selected = {
    department: (searchParams?.department as string) || undefined,
    location: (searchParams?.location as string) || undefined,
    managerId: (searchParams?.managerId as string) || undefined,
    attributes: {},
  };
  return { selected };
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CLOSED: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${map[status] ?? map.DRAFT}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
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
