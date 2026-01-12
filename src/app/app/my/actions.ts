"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePersonalAiLens } from "@/lib/myAiLens";
import { ensureMemberForUser } from "@/lib/members";
import { computeStatsForResponses, getPeriodRanges } from "@/lib/ai/analysisAggregates";
import { getDailySurveyHistory } from "@/lib/dailySurveys";
import {
  getPersonalStatus,
  getPersonalActionItems,
  getPersonalHabitsOverview,
  getPersonalAcademyOverview,
  getPersonalNudges,
} from "@/lib/myOverview";

function assertEmployee(user: { role: string }) {
  const normalized = (user.role ?? "").toUpperCase();
  const allowed = ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"];
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
  surveyHistory: [],
  error: "failed" as string | null,
});

export async function getMyHomeData() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertEmployee(user);

  try {
    const base = fallbackData(user.organizationId, user.id);
    const member = user.member ?? (await prisma.member.findFirst({ where: { userId: user.id } })) ?? (await ensureMemberForUser(user));
    if (!member) return base;
    const surveyHistory = await getDailySurveyHistory(member.id, 20);

    const include = { run: { include: { template: { include: { questions: true } } } } };

    const identityFilters = [{ memberId: member.id }];
    if (user.email) {
      identityFilters.push({ respondentEmail: user.email });
    }
    const baseWhere = {
      run: { orgId: user.organizationId },
      OR: identityFilters,
    };

    const latestResponse = await prisma.surveyResponse.findFirst({
      where: baseWhere,
      orderBy: { submittedAt: "desc" },
      select: { submittedAt: true },
    });

    const anchorDate = latestResponse?.submittedAt ?? new Date();
    const ranges6m = getPeriodRanges("half", anchorDate);
    const responses6m = await prisma.surveyResponse.findMany({
      where: {
        ...baseWhere,
        submittedAt: { gte: ranges6m.current.start, lte: ranges6m.current.end },
      },
      include,
      orderBy: { submittedAt: "desc" },
    });
    const stats6m = computeStatsForResponses(responses6m, "en", ranges6m.current);

    const ranges7d = getPeriodRanges("week", anchorDate);
    const responses7d = await prisma.surveyResponse.findMany({
      where: {
        ...baseWhere,
        submittedAt: { gte: ranges7d.current.start, lte: ranges7d.current.end },
      },
      include,
      orderBy: { submittedAt: "desc" },
    });
    const stats7d = computeStatsForResponses(responses7d, "en", ranges7d.current);

    const hasSamples = stats6m.overallCount > 0;
    const surveyWeekDays = 7;
    const participation =
      stats7d.sampleSizeTotal > 0 ? Math.min(100, Math.round((stats7d.sampleSizeTotal / surveyWeekDays) * 100)) : null;
    const stressOverallAvg = stats6m.overallCount > 0 ? stats6m.overallAvg : stats6m.stressAvg;
    const engagementAvg = stats6m.engagementCount > 0 ? stats6m.engagementAvg : null;
    const stressTrendSource =
      stats6m.overallTrend.length > 0
        ? stats6m.overallTrend
        : stats6m.stressTrend.length > 0
          ? stats6m.stressTrend
          : stats6m.engagementTrend;
    const stressTimeseries = stressTrendSource.map((point) => ({
      date: point.date ?? null,
      score: Number((point.value ?? 0).toFixed(2)),
    }));
    const engagementScore = engagementAvg != null ? Number(engagementAvg.toFixed(2)) : null;

    return {
      ...base,
      personalStatus: {
        ...base.personalStatus,
        stress: {
          score: hasSamples ? Number(stressOverallAvg.toFixed(2)) : null,
          delta: null,
          timeseries: stressTimeseries,
        },
        engagement: {
          score: hasSamples ? engagementScore : null,
          delta: null,
          participation,
        },
      },
      surveyHistory,
      error: null,
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
