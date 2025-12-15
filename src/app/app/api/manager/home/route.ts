import { NextResponse } from "next/server";
import { getManagerTeams, getTeamStatusOverview, getActionCenterItems, getUpcomingEvents, getAILensSummary } from "@/lib/managerOverview";

export async function GET(req: Request) {
  // Placeholder: in production extract userId from auth/session
  const userId = "";
  if (!userId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const teams = await getManagerTeams(userId);
  const primaryTeamId = teams[0]?.teamId;
  const teamCards: Record<string, any> = {};
  for (const t of teams) {
    teamCards[t.teamId] = {
      statusOverview: await getTeamStatusOverview({ orgId: "", teamId: t.teamId }),
      actionCenterItems: await getActionCenterItems({ orgId: "", managerId: userId, teamIds: [t.teamId], limit: 5 }),
      upcoming: await getUpcomingEvents({ orgId: "", teamIds: [t.teamId] }),
      aiLens: await getAILensSummary({ orgId: "", teamId: t.teamId }),
    };
  }
  return NextResponse.json({ data: { teams, primaryTeamId, teamCards } });
}
