import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { ManagerHomeClient, type ManagerHomeData } from "./ManagerHomeClient";
import { getTeamStatus } from "@/lib/statusLogic";

export default async function ManagerHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if ((user.role ?? "").toUpperCase() === "ADMIN") redirect("/app/overview");
  const locale = await getLocale();

  const teams = await prisma.team.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "asc" } });
  const teamIds = teams.map((t) => t.id);
  const metricsHistory = teamIds.length
    ? await prisma.teamMetricsHistory.findMany({ where: { teamId: { in: teamIds } }, orderBy: { createdAt: "asc" } })
    : [];
  const primaryTeam = teams[0];

  const teamCards: ManagerHomeData["teamCards"] = {};
  teams.forEach((team) => {
    const participationRate = (team.participation ?? 0) / 100;
    const engagement = team.engagementScore ?? 0;
    const stress = team.stressIndex ?? 0;
    const history = metricsHistory.filter((h) => h.teamId === team.id);
    const timeseries = history.map((h) => ({
      date: h.createdAt.toISOString(),
      score: h.engagementScore ?? 0,
    }));
    const riskLevel = getTeamStatus(stress, engagement, Math.round(participationRate * 100));
    teamCards[team.id] = {
      teamId: team.id,
      name: team.name,
      engagement: { score: engagement, delta: 0, timeseries },
      stress: { index: stress, delta: 0, riskLevel },
      participation: { rate: participationRate, delta: 0 },
      actionItems: [],
      upcoming: [],
      aiLens: { summary: "", risks: [], strengths: [], suggestedActions: [] },
      drivers: [],
    };
  });

  const data: ManagerHomeData = {
    orgId: user.organizationId,
    teams: teams.map((t) => ({ teamId: t.id, name: t.name })),
    primaryTeamId: primaryTeam?.id ?? teams[0]?.id ?? "",
    teamCards,
  };

  return <ManagerHomeClient data={data} locale={locale} />;
}
