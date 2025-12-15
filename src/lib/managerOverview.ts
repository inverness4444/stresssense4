import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getManagerTeams = cache(async (userId: string) => {
  const memberships = await prisma.member.findMany({ where: { userId }, include: { team: true } });
  return memberships.map((m: any) => ({ teamId: m.teamId, name: m.team.name }));
});

export async function getTeamStatusOverview(params: { orgId: string; teamId: string }) {
  const team = await prisma.team.findFirst({ where: { organizationId: params.orgId, id: params.teamId } });
  const history = await prisma.teamMetricsHistory.findMany({ where: { teamId: params.teamId }, orderBy: { createdAt: "asc" } });
  return {
    status: {
      stressIndex: team?.stressIndex ?? 0,
      engagementScore: team?.engagementScore ?? 0,
      participationRate: team?.participation ?? 0,
    },
    engagement: {
      score: team?.engagementScore ?? 0,
      delta: 0,
      timeseries: history.map((h: any) => ({ date: h.createdAt, score: h.engagementScore })),
    },
    stress: {
      index: team?.stressIndex ?? 0,
      delta: 0,
      riskLevel: team?.status ?? "Watch",
      trend: "stable",
    },
    participation: { rate: (team?.participation ?? 0) / 100, delta: 0 },
    coachUsage: { conversationsLast30d: 0, activeUsersShare: 0 },
    academy: { completionRate: 0, learnersCount: 0 },
    timeseries: history.map((h: any) => ({ date: h.createdAt.toISOString(), score: h.engagementScore })),
  };
}

export async function getActionCenterItems(params: { orgId: string; managerId: string; teamIds: string[]; limit?: number }) {
  const nudges = await prisma.nudgeInstance.findMany({
    where: { orgId: params.orgId, teamId: { in: params.teamIds }, status: { in: ["todo", "planned"] } },
    include: { template: true },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 10,
  });
  return nudges;
}

export async function getUpcomingEvents(params: { orgId: string; teamIds: string[] }) {
  return [];
}

export async function getAILensSummary(params: { orgId: string; teamId: string }) {
  const team = await prisma.team.findUnique({ where: { id: params.teamId } });
  return {
    summary: team ? `Stress ${team.stressIndex.toFixed(1)}, engagement ${team.engagementScore.toFixed(1)}.` : "No data",
    risks: ["workload", "clarity"],
    strengths: ["support", "recognition"],
    suggestedActions: ["Провести ревизию митингов", "Обсудить приоритеты"],
  };
}
