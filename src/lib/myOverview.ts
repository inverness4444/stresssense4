import { prisma } from "@/lib/prisma";

export async function getPersonalStatus(params: { orgId: string; userId: string }) {
  const snapshot = await prisma.personalStatusSnapshot.findFirst({
    where: { organizationId: params.orgId, userId: params.userId },
    orderBy: { periodEnd: "desc" },
  });
  const prevSnapshot = await prisma.personalStatusSnapshot.findFirst({
    where: { organizationId: params.orgId, userId: params.userId, periodEnd: { lt: snapshot?.periodEnd ?? new Date() } },
    orderBy: { periodEnd: "desc" },
  });

  type SnapshotKey =
    | "engagementScore"
    | "stressLevelScore"
    | "moodAverage"
    | "habitCompletionRate"
    | "coachConversations"
    | "academyProgressScore";

  const calcDelta = (field: SnapshotKey) => {
    if (!snapshot) return null;
    const curr = snapshot[field] as number | null;
    const prev = prevSnapshot ? ((prevSnapshot as any)[field] as number | null) : null;
    if (curr == null || prev == null) return null;
    return curr - prev;
  };

  return {
    snapshot,
    prevSnapshot,
    engagement: { score: snapshot?.engagementScore ?? null, delta: calcDelta("engagementScore") },
    stress: { score: snapshot?.stressLevelScore ?? null, delta: calcDelta("stressLevelScore") },
    mood: { average: snapshot?.moodAverage ?? null, delta: calcDelta("moodAverage") },
    habits: { completionRate: snapshot?.habitCompletionRate ?? null },
    coach: { conversations: snapshot?.coachConversations ?? null },
    academy: { progressScore: snapshot?.academyProgressScore ?? null },
  };
}

export async function getPersonalActionItems(params: { orgId: string; userId: string; limit?: number }) {
  return prisma.actionCenterItem.findMany({
    where: { organizationId: params.orgId, userId: params.userId, status: { in: ["open", "in_progress"] } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: params.limit ?? 10,
  });
}

export async function getPersonalHabitsOverview(params: { orgId: string; userId: string }) {
  const plan = await prisma.habitPlan.findFirst({
    where: { organizationId: params.orgId, userId: params.userId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { tasks: true },
  });

  if (!plan) {
    return { plan: null, tasks: [], todayTasks: [] };
  }

  const taskIds = plan.tasks.map((t) => t.id);
  const checkins = await prisma.habitCheckin.findMany({
    where: { userId: params.userId, taskId: { in: taskIds } },
    orderBy: { date: "desc" },
    take: 200,
  });

  const tasks = plan.tasks.map((t) => {
    const recents = checkins.filter((c) => c.taskId === t.id);
    const completed = recents.filter((c) => c.status === "done").length;
    const completionRate = recents.length ? completed / recents.length : 0;
    return { task: t, recentCheckins: recents, completionRate };
  });

  const today = new Date();
  const todayTasks = tasks.map((t) => ({
    task: t.task,
    done: t.recentCheckins.some((c) => c.date.toDateString() === today.toDateString() && c.status === "done"),
  }));

  return { plan, tasks, todayTasks };
}

export async function getPersonalAcademyOverview(params: { orgId: string; userId: string }) {
  const enrollments = await prisma.academyEnrollment.findMany({
    where: { organizationId: params.orgId, userId: params.userId, status: { in: ["in_progress", "completed"] } },
    include: { course: true, progresses: true },
  });
  const activeCourses = enrollments.filter((e) => e.status === "in_progress");
  const completionRate =
    enrollments.length === 0
      ? 0
      : enrollments.filter((e) => e.status === "completed").length / enrollments.length;
  return { enrollments, completionRate, activeCourses };
}

export async function getPersonalNudges(params: { orgId: string; userId: string; limit?: number }) {
  const nudges = await prisma.notification.findMany({
    where: { organizationId: params.orgId, userId: params.userId },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 10,
  });
  return nudges.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.body ?? undefined,
    createdAt: n.createdAt,
    type: n.type,
  }));
}
