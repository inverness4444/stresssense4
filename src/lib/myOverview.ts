import { prisma } from "@/lib/prisma";

export async function getPersonalStatus(params: { orgId: string; userId: string }) {
  const member = await prisma.member.findFirst({ where: { userId: params.userId }, include: { metrics: true } });
  const metrics = member?.metrics;
  return {
    snapshot: metrics,
    prevSnapshot: null,
    engagement: { score: null, delta: null },
    stress: { score: metrics?.lastStressIndex ?? null, delta: null },
    mood: { average: metrics?.mood ?? null, delta: null },
    habits: { completionRate: metrics?.habitsCompletion ?? null },
    coach: { conversations: null },
    academy: { progressScore: null },
  };
}

export async function getPersonalActionItems(params: { orgId: string; userId: string; limit?: number }) {
  const member = await prisma.member.findFirst({ where: { userId: params.userId } });
  if (!member) return [];
  return prisma.nudgeInstance.findMany({
    where: { orgId: params.orgId, memberId: member.id, status: { in: ["todo", "planned"] } },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 10,
  });
}

export async function getPersonalHabitsOverview(_params?: any) {
  return { plan: null, tasks: [], todayTasks: [] };
}

export async function getPersonalAcademyOverview(_params?: any) {
  return { enrollments: [], completionRate: 0, activeCourses: [] };
}

export async function getPersonalNudges(params: { orgId: string; userId: string; limit?: number }) {
  const member = await prisma.member.findFirst({ where: { userId: params.userId } });
  if (!member) return [];
  const nudges = await prisma.nudgeInstance.findMany({
    where: { orgId: params.orgId, memberId: member.id },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 10,
    include: { template: true },
  });
  return nudges.map((n: any) => ({
    id: n.id,
    title: n.template?.title ?? "Nudge",
    description: n.notes ?? n.template?.description ?? undefined,
    createdAt: n.createdAt,
    type: "NUDGE",
  }));
}
