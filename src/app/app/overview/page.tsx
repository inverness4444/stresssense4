import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NpsWidget } from "@/components/app/NpsWidget";
import { SurveyReport } from "@/components/app/SurveyReport";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Позволяем всем ролям видеть обзор, как в старой версии

  const teams = await prisma.team.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } });
  const runs = (await prisma.surveyRun.findMany({ where: { orgId: user.organizationId }, orderBy: { launchedAt: "desc" }, take: 5 })) ?? [];
  const nudges = await prisma.nudgeInstance.findMany({
    where: { orgId: user.organizationId, status: { in: ["todo", "planned"] } },
    include: { template: true, team: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const sampleTeams: any[] = [
    { id: "sample-1", name: "Product", stressIndex: 7.0, engagementScore: 7.2, participation: 80, status: "Watch" },
    { id: "sample-2", name: "Marketing", stressIndex: 7.0, engagementScore: 7.0, participation: 80, status: "UnderPressure" },
  ];
  const safeTeams = teams.length ? teams : sampleTeams;
  const safeRuns =
    runs.length > 0
      ? runs
      : [
          { id: "sample-run", title: "Stress & Engagement pulse", launchedAt: new Date(), avgStressIndex: 6.5, avgEngagementScore: 7.1 },
        ];
  const safeNudges =
    (nudges ?? []).length > 0
      ? nudges
      : [
          {
            id: "sample-nudge-1",
            template: { title: "Провести ревизию митингов", description: "Сократите повторяющиеся встречи и освободите фокус.", triggerTags: ["meetings"] },
            status: "todo",
            team: { name: "Product" },
            tags: ["meetings"],
          },
          {
            id: "sample-nudge-2",
            template: { title: "Перераспределить задачи", description: "Сдвиньте задачи, чтобы снизить нагрузку.", triggerTags: ["workload", "clarity"] },
            status: "planned",
            team: { name: "Marketing" },
            tags: ["workload", "clarity"],
          },
        ];

  const avgStressRaw = safeTeams.length ? safeTeams.reduce((acc: number, t: any) => acc + (t.stressIndex ?? 0), 0) / safeTeams.length : 0;
  const avgEngagementRaw = safeTeams.length ? safeTeams.reduce((acc: number, t: any) => acc + (t.engagementScore ?? 0), 0) / safeTeams.length : 0;
  const participationRaw = safeTeams.length ? Math.round(safeTeams.reduce((acc: number, t: any) => acc + (t.participation ?? 0), 0) / safeTeams.length) : 0;
  const avgStress = avgStressRaw || 7.0;
  const avgEngagement = avgEngagementRaw || 7.0;
  const participation = participationRaw || 80;
  const activeSurveys = runs.length || safeRuns.length;

  const engagementScore =
    safeRuns.length && safeRuns[0].avgEngagementScore ? safeRuns[0].avgEngagementScore : avgEngagement || 7.0;

  const reportTimeseries =
    safeRuns.length > 1
      ? safeRuns.map((run: any, idx: number) => ({
          label: run.launchedAt ? new Date(run.launchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `W${idx + 1}`,
          value: run.avgEngagementScore ?? engagementScore,
        }))
      : [
          { label: "Mar", value: Math.max(6.5, engagementScore - 0.3) },
          { label: "Apr", value: Math.max(6.5, engagementScore - 0.2) },
          { label: "May", value: engagementScore - 0.1 },
          { label: "Jun", value: engagementScore + 0.2 },
          { label: "Jul", value: engagementScore + 0.1 },
          { label: "Aug", value: engagementScore + 0.3 },
        ];

  const driverCards = [
    { name: "Alignment", score: 7.6, delta: 0.2 },
    { name: "Recognition", score: 7.2, delta: 0.1 },
    { name: "Workload", score: Math.max(0, 10 - avgStress), delta: -0.3 },
    { name: "Psych. safety", score: 7.9, delta: 0.4 },
    { name: "Wellbeing", score: 7.1, delta: -0.1 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
          <h1 className="text-2xl font-semibold text-slate-900">Stress overview</h1>
          <p className="text-sm text-slate-600">Quick snapshot of your StressSense workspace.</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">EN</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">RU</span>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">At a glance</p>
            <h3 className="text-xl font-semibold text-slate-900">Workspace health</h3>
            <p className="text-sm text-slate-600 max-w-xl">Snapshot of stress, participation, engagement.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Metric label="Average stress index" value={`${avgStress.toFixed(1)}`} />
            <Metric label="Participation rate" value={`${participation}%`} />
            <Metric label="Engagement score" value={`${avgEngagement.toFixed(1)}`} />
            <Metric label="Active surveys" value={`${activeSurveys}`} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <SurveyReport
          title="Survey report"
          subtitle="Live preview"
          score={engagementScore || 0}
          delta={0.6}
          deltaDirection="up"
          periodLabel="Last 6 months"
          timeseries={reportTimeseries}
          drivers={driverCards}
          ctaLabel="Analyze engagement"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">AI insight</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Engagement steady, recognition and support drive sentiment.</li>
            <li>• Watch workload spikes in Product; clarify weekly priorities.</li>
            <li>• Participation is healthy; keep short updates to sustain it.</li>
          </ul>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">AI generated</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Your focus this week</p>
            <a href="/app/actions" className="text-sm font-semibold text-primary hover:underline">
              Открыть Action center
            </a>
          </div>
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">Run 1:1s with overloaded teams</p>
              <p className="text-xs text-slate-600">Discuss priorities and unblock top tasks.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">Celebrate recent wins</p>
              <p className="text-xs text-slate-600">Boost recognition in next team huddle.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">Clarify sprint priorities</p>
              <p className="text-xs text-slate-600">Share 3 outcomes for the next two weeks.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Your focus this week</p>
            <p className="text-sm text-slate-600">Основано на последних опросах стресса</p>
          </div>
          <a href="/app/actions" className="text-sm font-semibold text-primary hover:underline">
            Открыть Action center
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {safeNudges.slice(0, 3).map((nudge: any) => (
            <div key={nudge.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{nudge.template?.title ?? "Nudge"}</p>
                  <p className="text-xs text-slate-600">
                    {nudge.template?.description ?? "Suggested action based on team stress"} {nudge.team ? `· ${nudge.team.name}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(nudge.tags ?? nudge.template?.triggerTags ?? []).slice(0, 3).map((tag: string) => (
                      <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${
                    nudge.status === "planned"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {nudge.status}
                </span>
              </div>
            </div>
          ))}
          {(nudges ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600">
              Нет активных действий — запустите опрос, чтобы получить рекомендации.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recent surveys</h3>
        <div className="mt-3 space-y-2">
          {safeRuns.map((run: any) => (
            <div key={run.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm shadow-sm">
              <div>
                <p className="font-semibold text-slate-900">{run.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(run.launchedAt).toLocaleDateString()} · stress {run.avgStressIndex?.toFixed(1) ?? "n/a"} · engagement{" "}
                  {run.avgEngagementScore?.toFixed(1) ?? "n/a"}
                </p>
              </div>
            </div>
          ))}
          {safeRuns.length === 0 && <p className="text-sm text-slate-600">No surveys yet.</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Команды</h3>
            <p className="text-sm text-slate-600">Stress / Engagement / Participation</p>
          </div>
          <a href="/app/teams" className="text-sm font-semibold text-primary hover:underline">
            Все команды
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {safeTeams.slice(0, 6).map((team: any) => (
            <div key={team.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase text-slate-600">
                  {team.status ?? "Watch"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Stress {(team.stressIndex ?? 0).toFixed(1)}</span>
                <span>Eng {(team.engagementScore ?? 0).toFixed(1)}</span>
                <span>Part {Math.round(team.participation ?? 0)}%</span>
              </div>
            </div>
          ))}
          {safeTeams.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600">
              Пока нет команд. Создайте команду, чтобы получать метрики.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Tell us how we’re doing</h3>
            <p className="text-xs text-slate-500">Quick NPS check</p>
          </div>
        </div>
        <div className="mt-3">
          <NpsWidget surveyId="nps_default" />
        </div>
      </section>

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
