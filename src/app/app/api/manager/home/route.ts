import { NextResponse } from "next/server";
import { getManagerTeams, getTeamStatusOverview, getActionCenterItems, getUpcomingEvents, getAILensSummary } from "@/lib/managerOverview";
import { requireApiUser } from "@/lib/apiAuth";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const user = auth.user;
  const role = (user.role ?? "").toUpperCase();
  if (!["MANAGER", "ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teams = await getManagerTeams(user.id, user.organizationId);
  const primaryTeamId = teams[0]?.teamId;
  const teamCards: Record<string, any> = {};
  for (const t of teams) {
    teamCards[t.teamId] = {
      statusOverview: await getTeamStatusOverview({ orgId: user.organizationId, teamId: t.teamId }),
      actionCenterItems: await getActionCenterItems({ orgId: user.organizationId, managerId: user.id, teamIds: [t.teamId], limit: 5 }),
      upcoming: await getUpcomingEvents({ orgId: user.organizationId, teamIds: [t.teamId] }),
      aiLens: await getAILensSummary({ orgId: user.organizationId, teamId: t.teamId }),
    };
  }
  return NextResponse.json({ data: { teams, primaryTeamId, teamCards } });
}
