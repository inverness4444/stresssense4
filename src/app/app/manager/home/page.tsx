import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { ManagerHomeClient, type ManagerHomeData } from "./ManagerHomeClient";

export default async function ManagerHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if ((user.role ?? "").toUpperCase() === "ADMIN") redirect("/app/overview");
  const locale = await getLocale();

  const teams = await prisma.team.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "asc" } });
  const primaryTeam = teams[0];

  const teamCards: ManagerHomeData["teamCards"] = {};
  teams.forEach((team, idx) => {
    const participationRate = (team.participation ?? 0) / 100;
    const engagement = team.engagementScore ?? 7;
    const stress = team.stressIndex ?? 6.5;
    const timeseries = Array.from({ length: 6 }).map((_, i) => ({
      date: new Date(Date.now() - (5 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      score: Number((engagement + (i - 3) * 0.05).toFixed(1)),
    }));
    teamCards[team.id] = {
      teamId: team.id,
      name: team.name,
      engagement: { score: engagement, delta: 0.2, timeseries },
      stress: { index: stress, delta: -0.1, riskLevel: idx % 2 === 0 ? "watch" : "at_risk", trend: "stable" },
      participation: { rate: participationRate, delta: 0.02 },
      actionItems: [],
      upcoming: [],
      aiLens: { summary: "Ключевые драйверы: нагрузка и ясность. Поддержите recognition.", risks: [], strengths: [], suggestedActions: [] },
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
