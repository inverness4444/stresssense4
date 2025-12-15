"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePersonalAiLens } from "@/lib/myAiLens";
import {
  getPersonalStatus,
  getPersonalActionItems,
  getPersonalHabitsOverview,
  getPersonalAcademyOverview,
  getPersonalNudges,
} from "@/lib/myOverview";

function assertEmployee(user: { role: string }) {
  const normalized = (user.role ?? "").toUpperCase();
  const allowed = ["EMPLOYEE", "MANAGER", "HR", "ADMIN"];
  if (!allowed.includes(normalized)) throw new Error("Forbidden");
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

  try {
    return fallbackData(user.organizationId, user.id);
  } catch (e) {
    console.error("getMyHomeData failed", e);
    return fallbackData(user.organizationId, user.id);
  }
}

export async function updatePersonalActionItemStatus(id: string, status: "open" | "in_progress" | "done" | "dismissed") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) throw new Error("No member");
  const item = await prisma.nudgeInstance.findUnique({ where: { id } });
  if (!item || item.orgId !== user.organizationId || item.memberId !== member.id) throw new Error("Not found");

  const done = status === "done" || status === "dismissed";
  const updated = await prisma.nudgeInstance.update({
    where: { id },
    data: {
      status: status === "dismissed" ? "done" : status,
      resolvedAt: done ? new Date() : null,
    },
  });
  revalidatePath("/app/my/home");
  return updated;
}

export async function createPersonalActionItem(input: { title: string; description?: string; dueAt?: Date | string | null; type?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);
  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) throw new Error("No member");
  const created = await prisma.nudgeInstance.create({
    data: {
      orgId: user.organizationId,
      teamId: member.teamId,
      memberId: member.id,
      templateId: "",
      status: "todo",
      source: "manual",
      notes: input.description ?? null,
      tags: [],
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
