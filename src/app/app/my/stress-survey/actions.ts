"use server";

import { revalidatePath } from "next/cache";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { ensureMemberForUser } from "@/lib/members";
import {
  DAILY_SURVEY_SEED_DAYS,
  getDailySurveyHistory,
  getOrCreateDailySurveyRun,
  serializeDailySurvey,
  recomputeTeamMetricsForDailyRun,
} from "@/lib/dailySurveys";
import { getBillingGateStatus } from "@/lib/billingGate";
import { computeStatsForResponses } from "@/lib/ai/analysisAggregates";
import { updateMemberFromPulse, updateTeamMetricsFromSurvey } from "@/lib/orgData";
import { env } from "@/config/env";
import { isSuperAdmin } from "@/lib/roles";

const SURVEY_ROLES = new Set(["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"]);
const BACKFILL_EMAIL = "abuzada@mail.ru";
const BACKFILL_START = new Date(Date.UTC(2025, 11, 17, 12, 0, 0));
const BACKFILL_DAYS = 60;

function assertSurveyAccess(user: { role?: string | null }) {
  const role = (user.role ?? "").toUpperCase();
  if (!SURVEY_ROLES.has(role)) {
    throw new Error("Forbidden");
  }
  return role;
}

function normalizeLocale(locale?: string | null) {
  return locale === "ru" ? "ru" : "en";
}

function isBackfillUser(userEmail: string | null | undefined) {
  return Boolean(userEmail && userEmail.toLowerCase() === BACKFILL_EMAIL);
}

function getMoscowTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "NaN");
  return { hour: get("hour"), minute: get("minute") };
}

function shouldAutoCreateDailySurvey(date = new Date()) {
  const { hour, minute } = getMoscowTimeParts(date);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
  return hour > 12 || (hour === 12 && minute >= 50);
}

function getBackfillRange() {
  const start = startOfDay(BACKFILL_START);
  const end = endOfDay(addDays(start, BACKFILL_DAYS - 1));
  return { start, end };
}

async function getBackfillRunDate(userEmail: string | null | undefined, memberId: string) {
  if (!isBackfillUser(userEmail)) return null;

  const { start: rangeStart, end: rangeEnd } = getBackfillRange();
  const runs = await prisma.surveyRun.findMany({
    where: {
      memberId,
      runType: "daily",
      runDate: { gte: rangeStart, lte: rangeEnd },
    },
    select: { runDate: true },
    orderBy: { runDate: "asc" },
  });
  const existing = new Set(
    runs.map((run) => (run.runDate ? run.runDate.toISOString().slice(0, 10) : null)).filter(Boolean)
  );

  for (let i = 0; i < BACKFILL_DAYS; i += 1) {
    const candidate = addDays(BACKFILL_START, i);
    const key = candidate.toISOString().slice(0, 10);
    if (!existing.has(key)) return candidate;
  }

  return null;
}

type DailySurveySummary = {
  runId: string;
  title: string;
  dayIndex: number | null;
  source: string;
  runDate: string;
};

type DailySurveyAnswerInput = {
  questionId: string;
  type: string;
  scaleValue?: number | null;
  textValue?: string | null;
  selectedOptions?: string[] | null;
};


export async function getDailySurveyPageData() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const role = assertSurveyAccess(user);
  const isSuper = isSuperAdmin(user.role);
  const locale = normalizeLocale(await getLocale());

  const member = user.member ?? (await ensureMemberForUser(user));
  if (!member) throw new Error("Member not found");

  const [runCount, orgMeta] = await Promise.all([
    prisma.surveyRun.count({ where: { memberId: member.id, runType: "daily" } }),
    prisma.organization.findUnique({
      where: { id: member.organizationId },
      select: { createdAt: true },
    }),
  ]);

  const gateStatus = await getBillingGateStatus(member.organizationId, orgMeta?.createdAt ?? null, { userRole: user.role });
  const surveyOverride = isBackfillUser(user.email) || isSuper;

  const now = new Date();
  const backfillActive = isBackfillUser(user.email);
  let pendingRun = null;
  if (backfillActive) {
    const range = getBackfillRange();
    pendingRun = await prisma.surveyRun.findFirst({
      where: {
        memberId: member.id,
        runType: "daily",
        runDate: { gte: range.start, lte: range.end },
        responses: { none: {} },
      },
      include: { template: { include: { questions: true } } },
      orderBy: { runDate: "asc" },
    });
  }
  const backfillDate = pendingRun ? null : await getBackfillRunDate(user.email, member.id);
  const allowAutoCreate = backfillDate ? true : shouldAutoCreateDailySurvey(now);
  const activeRun = pendingRun ?? await getOrCreateDailySurveyRun({
    memberId: member.id,
    date: backfillDate ?? now,
    locale,
    createdByUserId: user.id,
    allowAi: gateStatus.hasPaidAccess || env.isDev || surveyOverride,
    allowMultiplePerDay: false,
    deferAi: !allowAutoCreate,
  });
  const runHasResponses = Boolean((activeRun as any)?.responses?.length);
  const hideNonAi =
    activeRun &&
    (activeRun.dayIndex ?? DAILY_SURVEY_SEED_DAYS + 1) > DAILY_SURVEY_SEED_DAYS &&
    activeRun.source !== "ai" &&
    !runHasResponses;
  const todaySurvey = activeRun && !hideNonAi ? await serializeDailySurvey(activeRun) : null;
  let todayCompletedAt: string | null = null;
  let todayScore: number | null = null;
  let canStart = false;

  if (todaySurvey?.runId) {
    const run = await prisma.surveyRun.findUnique({
      where: { id: todaySurvey.runId },
      include: { responses: true },
    });
    const response = run?.responses?.[0] ?? null;
    if (response?.submittedAt) {
      todayCompletedAt = response.submittedAt.toISOString();
      todayScore = run?.avgStressIndex ?? null;
    } else {
      canStart = true;
    }
  }

  const history = await getDailySurveyHistory(member.id, 20);
  const fallbackDayIndex = runCount + 1;
  const nextDayIndex = todaySurvey?.dayIndex ?? fallbackDayIndex;
  const aiLocked =
    nextDayIndex > DAILY_SURVEY_SEED_DAYS && !gateStatus.hasPaidAccess && !env.isDev && !surveyOverride;

  const todaySummary: DailySurveySummary | null = todaySurvey
    ? {
        runId: todaySurvey.runId,
        title: todaySurvey.title,
        dayIndex: todaySurvey.dayIndex ?? null,
        source: todaySurvey.source,
        runDate: todaySurvey.runDate,
      }
    : null;

  return {
    userName: user.name ?? "",
    userId: user.id,
    userEmail: user.email,
    role,
    locale,
    todaySurvey: todaySummary,
    todayCompletedAt,
    todayScore,
    canStart,
    aiLocked,
    history,
  };
}

export async function getTodayDailySurvey() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertSurveyAccess(user);
  const isSuper = isSuperAdmin(user.role);
  const member = user.member ?? (await ensureMemberForUser(user));
  if (!member) throw new Error("Member not found");
  const locale = normalizeLocale(await getLocale());
  const orgMeta = await prisma.organization.findUnique({
    where: { id: member.organizationId },
    select: { createdAt: true },
  });
  const gateStatus = await getBillingGateStatus(member.organizationId, orgMeta?.createdAt ?? null, { userRole: user.role });
  const surveyOverride = isBackfillUser(user.email) || isSuper;
  const now = new Date();
  const backfillActive = isBackfillUser(user.email);
  let pendingRun = null;
  if (backfillActive) {
    const range = getBackfillRange();
    pendingRun = await prisma.surveyRun.findFirst({
      where: {
        memberId: member.id,
        runType: "daily",
        runDate: { gte: range.start, lte: range.end },
        responses: { none: {} },
      },
      include: { template: { include: { questions: true } } },
      orderBy: { runDate: "asc" },
    });
  }
  const backfillDate = pendingRun ? null : await getBackfillRunDate(user.email, member.id);
  const allowAutoCreate = backfillDate ? true : shouldAutoCreateDailySurvey(now);
  const run = pendingRun ?? await getOrCreateDailySurveyRun({
    memberId: member.id,
    date: backfillDate ?? now,
    locale,
    createdByUserId: user.id,
    allowAi: gateStatus.hasPaidAccess || env.isDev || surveyOverride,
    allowMultiplePerDay: false,
    deferAi: !allowAutoCreate,
  });
  if (!run) return null;
  if ((run.dayIndex ?? DAILY_SURVEY_SEED_DAYS + 1) > DAILY_SURVEY_SEED_DAYS && run.source !== "ai") {
    const responseCount = await prisma.surveyResponse.count({ where: { runId: run.id } });
    if (responseCount === 0) return null;
  }
  return serializeDailySurvey(run);
}

export async function submitDailySurvey(input: { runId: string; answers: DailySurveyAnswerInput[]; completedAt?: string }) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  assertSurveyAccess(user);

  const member = user.member ?? (await ensureMemberForUser(user));
  if (!member) throw new Error("Member not found");

  const run = await prisma.surveyRun.findUnique({
    where: { id: input.runId },
    include: { template: { include: { questions: true } }, responses: true },
  });
  if (!run) throw new Error("Survey not found");
  if (run.orgId !== user.organizationId) throw new Error("Forbidden");
  if (run.memberId && run.memberId !== member.id) throw new Error("Forbidden");

  if (run.responses.length > 0) {
    return {
      ok: true,
      alreadySubmitted: true,
      stressIndex: run.avgStressIndex ?? null,
      engagementScore: run.avgEngagementScore ?? null,
    };
  }

  const submittedAt = input.completedAt ? new Date(input.completedAt) : new Date();
  if (Number.isNaN(submittedAt.getTime())) throw new Error("Invalid date");

  const answerMap = input.answers.reduce<Record<string, DailySurveyAnswerInput>>((acc, answer) => {
    acc[answer.questionId] = {
      questionId: answer.questionId,
      type: answer.type,
      scaleValue: answer.scaleValue ?? null,
      textValue: answer.textValue ?? null,
      selectedOptions: answer.selectedOptions ?? null,
    };
    return acc;
  }, {});

  await prisma.surveyResponse.create({
    data: {
      runId: run.id,
      memberId: member.id,
      respondentEmail: user.email ?? null,
      submittedAt,
      answers: answerMap as any,
    },
  });

  const responses = await prisma.surveyResponse.findMany({
    where: { runId: run.id },
    include: { run: { include: { template: { include: { questions: true } } } } },
    orderBy: { submittedAt: "desc" },
  });
  const runDate = run.runDate ?? submittedAt;
  const stats = computeStatsForResponses(responses, "en", { start: startOfDay(runDate), end: endOfDay(runDate) });
  const stressIndex = stats.stressCount ? stats.stressAvg : stats.overallAvg;
  const engagementScore = stats.engagementCount ? stats.engagementAvg : 0;

  await prisma.surveyRun.update({
    where: { id: run.id },
    data: {
      avgStressIndex: stressIndex,
      avgEngagementScore: engagementScore,
      completedCount: responses.length,
    },
  });

  if (run.teamId) {
    const teamMetrics = await recomputeTeamMetricsForDailyRun(run.teamId, runDate, run.orgId);
    if (teamMetrics) {
      await updateTeamMetricsFromSurvey(run.teamId, teamMetrics, []);
    }
  }

  try {
    const orgMeta = await prisma.organization.findUnique({
      where: { id: member.organizationId },
      select: { createdAt: true },
    });
    const gateStatus = await getBillingGateStatus(member.organizationId, orgMeta?.createdAt ?? null, { userRole: user.role });
    const surveyOverride = isBackfillUser(user.email) || isSuperAdmin(user.role);
    const allowAi = gateStatus.hasPaidAccess || env.isDev || surveyOverride;
    if (allowAi) {
      const nextLocale = normalizeLocale(run.template?.language ?? (await getLocale()));
      await getOrCreateDailySurveyRun({
        memberId: member.id,
        date: addDays(runDate, 1),
        locale: nextLocale,
        createdByUserId: user.id,
        allowAi: true,
        allowMultiplePerDay: false,
        deferAi: true,
      });
    }
  } catch (err) {
    console.warn("Failed to pre-generate next daily survey", err);
  }

  await updateMemberFromPulse(member.id, { wellbeing: engagementScore, engagementScore: stressIndex });

  revalidatePath("/app/my/stress-survey");
  revalidatePath("/app/my/home");
  revalidatePath("/app/overview");
  revalidatePath("/app/teams");

  return { ok: true, stressIndex, engagementScore };
}
