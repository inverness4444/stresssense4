import { prisma } from "@/lib/prisma";
import { generateManagerAiLens } from "@/lib/managerAiLens";
import { cache } from "react";

export const getManagerTeams = cache(async (userId: string) => {
  const teams = await prisma.userTeam.findMany({ where: { userId }, include: { team: true } });
  return teams.map((t) => ({ teamId: t.teamId, name: t.team.name }));
});

export async function getTeamStatusOverview(params: { orgId: string; teamId: string }) {
  const status = await prisma.teamStatusSnapshot.findFirst({
    where: { organizationId: params.orgId, teamId: params.teamId },
    orderBy: { periodEnd: "desc" },
  });

  const engagementSnap = await prisma.surveyEngagementSnapshot.findFirst({
    where: { organizationId: params.orgId, teamId: params.teamId },
    include: { timeseries: true },
    orderBy: { periodEnd: "desc" },
  });

  const risk = await prisma.teamRiskSnapshot.findFirst({
    where: { organizationId: params.orgId, teamId: params.teamId },
    orderBy: { createdAt: "desc" },
  });

  const participation =
    status?.participationRate ??
    (await prisma.survey.findFirst({
      where: { organizationId: params.orgId, targets: { some: { teamId: params.teamId } } },
      select: {
        inviteTokens: { select: { id: true }, where: { usedAt: null } },
        responses: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }).then((s) => {
      if (!s) return undefined;
      const total = s.inviteTokens.length + s.responses.length;
      return total ? s.responses.length / total : undefined;
    })) ??
    0;

  const coachUsageCount = await prisma.usageRecord.aggregate({
    where: { organizationId: params.orgId, metric: "ai_coach_requests", periodStart: { gte: new Date(Date.now() - 30 * 86400000) } },
    _sum: { value: true },
  });

  return {
    status,
    engagement: {
      score: engagementSnap?.engagementScore ?? status?.engagementScore ?? 0,
      delta: engagementSnap?.delta ?? 0,
      timeseries: engagementSnap?.timeseries ?? [],
    },
    stress: {
      index: status?.stressIndex ?? risk?.riskScore ?? 0,
      delta: 0,
      riskLevel: status?.riskLevel ?? risk?.stressLevel ?? "medium",
      trend: status?.trendLabel ?? risk?.stressLevel ?? "stable",
    },
    participation: { rate: participation ?? 0, delta: 0 },
    coachUsage: {
      conversationsLast30d: coachUsageCount._sum.value ?? 0,
      activeUsersShare: status?.coachUsageScore ?? 0,
    },
    academy: { completionRate: status?.academyCompletionRate ?? 0, learnersCount: 0 },
    timeseries: engagementSnap?.timeseries?.map((p) => ({ date: p.date.toISOString(), score: p.score })) ?? [],
  };
}

export async function getActionCenterItems(params: { orgId: string; managerId: string; teamIds: string[]; limit?: number }) {
  return prisma.actionCenterItem.findMany({
    where: {
      organizationId: params.orgId,
      status: { in: ["open", "in_progress"] },
      OR: [{ managerUserId: params.managerId }, { teamId: { in: params.teamIds } }],
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: params.limit ?? 10,
  });
}

export async function getUpcomingEvents(params: { orgId: string; teamIds: string[] }) {
  const surveys = await prisma.surveySchedule.findMany({
    where: {
      organizationId: params.orgId,
      startsOn: { gt: new Date() },
      targets: params.teamIds.length ? { some: { teamId: { in: params.teamIds } } } : undefined,
    },
    take: 5,
    orderBy: { startsOn: "asc" },
  });

  return surveys.map((s) => ({
    type: "survey" as const,
    title: s.name ?? "Scheduled pulse",
    date: s.startsOn?.toISOString() ?? "",
    ref: s.id,
  }));
}

export async function getAILensSummary(params: { orgId: string; teamId: string }) {
  return generateManagerAiLens(params);
}
