import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getManagerTeams, getTeamStatusOverview, getActionCenterItems, getUpcomingEvents, getAILensSummary } from "@/lib/managerOverview";
import { ManagerHomeClient, ManagerHomeData } from "./ManagerHomeClient";

export default async function ManagerHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Please sign in.</div>;
  }
  if (user.role !== "MANAGER" && user.role !== "HR" && user.role !== "ADMIN") {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">You don&apos;t have access.</div>;
  }
  const flag = await isFeatureEnabled("manager_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!flag) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Manager cockpit is not enabled for this workspace.</div>;
  }

  const teams = await getManagerTeams(user.id);
  if (!teams.length) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">No teams assigned to you yet.</div>;
  }

  const teamIds = teams.map((t) => t.teamId);
  const [actionItems, upcoming] = await Promise.all([
    getActionCenterItems({ orgId: user.organizationId, managerId: user.id, teamIds, limit: 20 }),
    getUpcomingEvents({ orgId: user.organizationId, teamIds }),
  ]);

  const teamCards: ManagerHomeData["teamCards"] = {};
  for (const team of teams) {
    const status = await getTeamStatusOverview({ orgId: user.organizationId, teamId: team.teamId });
    const aiLens = await getAILensSummary({ orgId: user.organizationId, teamId: team.teamId });
    const items = actionItems
      .filter((i) => !i.teamId || i.teamId === team.teamId)
      .map((i) => ({
        ...i,
        dueAt: i.dueAt ? i.dueAt.toISOString() : null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        completedAt: i.completedAt ? i.completedAt.toISOString() : null,
      }));
    teamCards[team.teamId] = {
      teamId: team.teamId,
      name: team.name,
      engagement: {
        score: status.engagement.score,
        delta: status.engagement.delta,
        timeseries: status.engagement.timeseries?.map((p) => ({ date: typeof p.date === "string" ? p.date : p.date.toISOString(), score: p.score })) ?? [],
      },
      stress: status.stress,
      participation: status.participation,
      actionItems: items,
      upcoming,
      aiLens: aiLens ?? { summary: "", risks: [], strengths: [], suggestedActions: [] },
    };
  }

  const data: ManagerHomeData = {
    orgId: user.organizationId,
    teams,
    primaryTeamId: teams[0].teamId,
    teamCards,
  };

  return <ManagerHomeClient data={data} />;
}
