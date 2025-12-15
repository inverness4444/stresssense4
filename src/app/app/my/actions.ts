"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { generatePersonalAiLens } from "@/lib/myAiLens";
import {
  getPersonalStatus,
  getPersonalActionItems,
  getPersonalHabitsOverview,
  getPersonalAcademyOverview,
  getPersonalNudges,
} from "@/lib/myOverview";

function assertEmployee(user: { role: string }) {
  if (!["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(user.role)) throw new Error("Forbidden");
}

const fallbackData = (orgId: string, userId: string) => ({
  orgId,
  userId,
  personalStatus: {
    snapshot: null,
    prevSnapshot: null,
    engagement: { score: null, delta: null },
    stress: { score: null, delta: null },
    mood: { average: null, delta: null },
    habits: { completionRate: null },
    coach: { conversations: null },
    academy: { progressScore: null },
  },
  habitsOverview: { plan: null, tasks: [], todayTasks: [] },
  academyOverview: { enrollments: [], completionRate: 0, activeCourses: [] },
  nudges: [],
  personalActionItems: [],
  aiLens: {
    summary: "We couldn't load insights right now. Try again shortly.",
    risks: [],
    strengths: [],
    suggestedHabits: [],
    suggestedCourses: [],
  },
  oneOnOnes: { relationships: [], upcomingMeetings: [], overdueMeetings: [] },
  goals: { activeGoals: [], completedGoals: [], recentCheckins: [] },
  error: "failed" as string | null,
});

export async function getMyHomeData() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  const enabled = await isFeatureEnabled("employee_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (enabled === false) {
    return fallbackData(user.organizationId, user.id);
  }

  try {
    const [personalStatus, habitsOverview, academyOverview, nudges, personalActionItems, aiLens, oneOnOnes, goals] = await Promise.all([
      getPersonalStatus({ orgId: user.organizationId, userId: user.id }),
      getPersonalHabitsOverview({ orgId: user.organizationId, userId: user.id }),
      getPersonalAcademyOverview({ orgId: user.organizationId, userId: user.id }),
      getPersonalNudges({ orgId: user.organizationId, userId: user.id, limit: 10 }),
      getPersonalActionItems({ orgId: user.organizationId, userId: user.id, limit: 10 }),
      generatePersonalAiLens({ orgId: user.organizationId, userId: user.id }),
      (await import("@/lib/peopleOverview")).getOneOnOneOverviewForEmployee({ orgId: user.organizationId, userId: user.id }),
      (await import("@/lib/peopleOverview")).getGoalsOverviewForUser({ orgId: user.organizationId, userId: user.id }),
    ]);

    return {
      orgId: user.organizationId,
      userId: user.id,
      personalStatus,
      habitsOverview,
      academyOverview,
      nudges,
      personalActionItems,
      aiLens,
      oneOnOnes,
      goals,
      error: null as string | null,
    };
  } catch (e) {
    console.error("getMyHomeData failed", e);
    return fallbackData(user.organizationId, user.id);
  }
}

export async function updatePersonalActionItemStatus(id: string, status: "open" | "in_progress" | "done" | "dismissed") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  const item = await prisma.actionCenterItem.findUnique({ where: { id } });
  if (!item || item.organizationId !== user.organizationId || item.userId !== user.id) throw new Error("Not found");

  const done = status === "done" || status === "dismissed";
  const updated = await prisma.actionCenterItem.update({
    where: { id },
    data: {
      status,
      completedAt: done ? new Date() : null,
      completedByUserId: done ? user.id : null,
    },
  });
  revalidatePath("/app/my/home");
  return updated;
}

export async function createPersonalActionItem(input: { title: string; description?: string; dueAt?: Date | string | null; type?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  const created = await prisma.actionCenterItem.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      type: input.type ?? "personal",
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      severity: "medium",
      status: "open",
    },
  });
  revalidatePath("/app/my/home");
  return created;
}

export async function quickCreateHabitFromAiSuggestion(suggestionText: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  let plan = await prisma.habitPlan.findFirst({
    where: { organizationId: user.organizationId, userId: user.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) {
    plan = await prisma.habitPlan.create({
      data: { organizationId: user.organizationId, userId: user.id, title: "My plan", status: "active" },
    });
  }
  await prisma.habitTask.create({
    data: {
      planId: plan.id,
      title: suggestionText.slice(0, 120),
      frequency: "daily",
      targetPerPeriod: 5,
      dueTimeLocal: "09:00",
      status: "active",
      sortOrder: 0,
    },
  });
  revalidatePath("/app/my/home");
  return getPersonalHabitsOverview({ orgId: user.organizationId, userId: user.id });
}

export async function quickEnrollToSuggestedCourse(courseId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  const existing = await prisma.academyEnrollment.findFirst({
    where: { organizationId: user.organizationId, userId: user.id, courseId },
  });
  if (existing) {
    await prisma.academyEnrollment.update({
      where: { id: existing.id },
      data: { status: "in_progress", startedAt: new Date() },
    });
  } else {
    await prisma.academyEnrollment.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        courseId,
        status: "in_progress",
        startedAt: new Date(),
      },
    });
  }
  revalidatePath("/app/my/home");
  return getPersonalAcademyOverview({ orgId: user.organizationId, userId: user.id });
}
