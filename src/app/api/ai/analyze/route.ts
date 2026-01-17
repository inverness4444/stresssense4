import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays, addMonths, addWeeks, differenceInCalendarDays, endOfDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import OpenAI from "openai";
import { env } from "@/config/env";
import { assertSameOrigin, requireApiUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getCache, setCache } from "@/lib/cache";
import type { AnalysisPayload, AnalysisScope, AnalysisLocale } from "@/lib/ai/analysisTypes";
import { buildComputedMetrics, computeStatsForResponses, getDriverKeys } from "@/lib/ai/analysisAggregates";
import { getBillingGateStatus } from "@/lib/billingGate";
import type { AiEngagementReport, DriverSentiment } from "@/lib/ai/engagementReport";
import { t } from "@/lib/i18n";
import { getDisplayStressIndex } from "@/lib/metricDisplay";

const bodySchema = z.object({
  scope: z.enum(["user", "org", "team"]),
  locale: z.enum(["ru", "en"]),
  from: z.string(),
  to: z.string(),
  teamId: z.string().optional(),
  scopeId: z.string().optional(),
});

const aiTextSchema = z.object({
  managerFocus: z
    .array(
      z.object({
        title: z.string(),
        tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
        description: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  nudges: z
    .array(
      z.object({
        text: z.string(),
        tags: z.union([z.array(z.string()), z.string()]).optional(),
        steps: z.union([z.array(z.string()), z.string()]).optional(),
      })
    )
    .optional()
    .default([]),
  drivers: z
    .object({
      positive: z.union([z.array(z.string()), z.string()]).optional().default([]),
      risk: z.union([z.array(z.string()), z.string()]).optional().default([]),
      summary: z.string().optional(),
    })
    .optional(),
});

function normalizeRole(role?: string | null) {
  return (role ?? "").toUpperCase();
}

function parseRange(from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null;
  let start = startOfDay(fromDate);
  let end = endOfDay(toDate);
  if (start > end) {
    const tmp = start;
    start = startOfDay(end);
    end = endOfDay(tmp);
  }
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const prevEnd = endOfDay(addDays(start, -1));
  const prevStart = startOfDay(addDays(prevEnd, -(days - 1)));
  return {
    current: { start, end },
    previous: { start: prevStart, end: prevEnd },
  };
}

const extractOutputText = (response: any) => {
  const direct = response?.output_text;
  if (typeof direct === "string" && direct.trim()) return direct;
  const output = response?.output;
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    if (item?.type !== "message") continue;
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part?.text === "string" && (part?.type === "output_text" || part?.type === "text")) {
        return part.text;
      }
      if (part?.type === "json" && part?.json) {
        return JSON.stringify(part.json);
      }
    }
  }
  return "";
};

const extractJsonPayload = (text: string) => {
  if (!text) return "";
  const unfenced = text.replace(/```json|```/gi, "").trim();
  if (unfenced.startsWith("{") && unfenced.endsWith("}")) return unfenced;
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start >= 0 && end > start) return unfenced.slice(start, end + 1);
  return unfenced;
};

const normalizeText = (value: string | undefined, fallback: string) => {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
};

const normalizeStringArray = (value: unknown, fallback: string[] = []) => {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return fallback;
};

const fillList = <T,>(items: T[], fallback: T[], minItems: number) => {
  const safe = items.length ? items.slice(0, minItems) : [];
  if (safe.length >= minItems) return safe;
  if (!fallback.length) return safe;
  const result = [...safe];
  for (let i = result.length; i < minItems; i += 1) {
    result.push(fallback[i % fallback.length]);
  }
  return result;
};

type DriverMetric = {
  key: string;
  label: string;
  avgScore: number;
  delta: number;
  sampleSize: number;
};

const formatPeriodLabel = (from: string, to: string, locale: AnalysisLocale) => {
  const formatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${from} - ${to}`;
  return `${formatter.format(start)} — ${formatter.format(end)}`;
};

const formatTrendLabel = (date: Date, locale: AnalysisLocale) =>
  date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" });

const ensureTrendPoints = (
  points: { label: string; value: number; date?: string }[],
  avgValue: number,
  period: { from: string; to: string },
  locale: AnalysisLocale
) => {
  if (points.length >= 2) return points;
  const fromDate = new Date(period.from);
  const toDate = new Date(period.to);
  const start = Number.isNaN(fromDate.getTime()) ? new Date() : fromDate;
  const endBase = Number.isNaN(toDate.getTime()) ? new Date(start.getTime() + 86400000) : toDate;
  const end = endBase.getTime() === start.getTime() ? new Date(start.getTime() + 86400000) : endBase;
  const first = points[0] ?? {
    label: formatTrendLabel(start, locale),
    value: avgValue,
    date: start.toISOString(),
  };
  return [
    {
      label: first.label || formatTrendLabel(start, locale),
      value: Number((first.value ?? avgValue).toFixed(1)),
      date: first.date ?? start.toISOString(),
    },
    {
      label: formatTrendLabel(end, locale),
      value: Number((first.value ?? avgValue).toFixed(1)),
      date: end.toISOString(),
    },
  ];
};

const pickDrivers = (drivers: DriverMetric[], sentiment: DriverSentiment) => {
  const sorted = [...drivers].sort((a, b) => (sentiment === "positive" ? b.delta - a.delta : a.delta - b.delta));
  return sorted.slice(0, 3);
};

const buildDriversSummary = (
  positive: { name: string }[],
  risk: { name: string }[],
  locale: AnalysisLocale
) => {
  const pos = positive.slice(0, 2).map((d) => d.name).filter(Boolean).join(", ");
  const neg = risk.slice(0, 2).map((d) => d.name).filter(Boolean).join(", ");
  if (locale === "ru") {
    return `Рост: ${pos || "нет выраженных"}; риски: ${neg || "не выделяются"}.`;
  }
  return `Gains: ${pos || "no clear drivers"}; risks: ${neg || "no clear risks"}.`;
};

const buildTrendInsight = (deltaEngagement: number, locale: AnalysisLocale) => {
  if (deltaEngagement > 0.2) {
    return locale === "ru"
      ? "Вовлеченность растет — сохраните текущие практики и закрепите их."
      : "Engagement is improving; keep current practices and reinforce them.";
  }
  if (deltaEngagement < -0.2) {
    return locale === "ru"
      ? "Вовлеченность снижается — стоит проверить нагрузку и ясность целей."
      : "Engagement is trending down; review workload and clarity of goals.";
  }
  return locale === "ru"
    ? "Динамика вовлеченности стабильна; можно точечно усиливать сильные стороны."
    : "Engagement is stable; focus on incremental improvements.";
};

const buildParticipationNote = (participationRate: number, locale: AnalysisLocale) => {
  if (participationRate <= 0) {
    return locale === "ru"
      ? "Нет данных об участии за этот период."
      : "No participation data for this period.";
  }
  if (participationRate < 60) {
    return locale === "ru"
      ? "Участие низкое — выводы могут быть менее точными."
      : "Participation is low; insights may be less reliable.";
  }
  if (participationRate < 80) {
    return locale === "ru"
      ? "Участие среднее; есть потенциал для роста."
      : "Participation is moderate; there is room to improve.";
  }
  return locale === "ru"
    ? "Участие высокое — выводы выглядят надежно."
    : "Participation is strong; insights look reliable.";
};

const buildFocusFallback = (drivers: DriverMetric[], locale: AnalysisLocale, audience: "employee" | "manager") =>
  drivers.slice(0, 3).map((driver) => ({
    title: locale === "ru" ? `Фокус: ${driver.label}` : `Focus: ${driver.label}`,
    tags: [driver.key],
    description:
      audience === "employee"
        ? locale === "ru"
          ? `Сделайте шаг по теме "${driver.label}" в своей ежедневной работе.`
          : `Take one personal step on "${driver.label}" in your daily work.`
        : locale === "ru"
          ? `Сфокусируйтесь на факторе "${driver.label}" и снимите ключевые блокеры в команде.`
          : `Focus on "${driver.label}" and remove the main blockers for the team.`,
  }));

const buildNudgesFallback = (drivers: DriverMetric[], locale: AnalysisLocale, audience: "employee" | "manager") =>
  drivers.slice(0, 3).map((driver) => ({
    text:
      audience === "employee"
        ? locale === "ru"
          ? `Попробуйте одно действие по теме "${driver.label}".`
          : `Try one personal action on "${driver.label}".`
        : locale === "ru"
          ? `Сделайте один управленческий шаг по теме "${driver.label}".`
          : `Take one managerial step on "${driver.label}".`,
    tags: [driver.key],
    steps:
      audience === "employee"
        ? locale === "ru"
          ? ["Определите, что мешает", "Выберите 1 небольшой шаг", "Зафиксируйте результат"]
          : ["Identify the blocker", "Pick 1 small step", "Track the outcome"]
        : locale === "ru"
          ? ["Определите причину", "Согласуйте 1-2 улучшения"]
          : ["Identify the root cause", "Agree on 1-2 improvements"],
  }));

type StatsResult = ReturnType<typeof computeStatsForResponses>;
type BucketGranularity = "day" | "week" | "month";
type BucketAggregate = { sum: number; count: number };
type RunMetric = {
  runDate: Date | string | null;
  launchedAt: Date | string | null;
  avgStressIndex: number | null;
  avgEngagementScore: number | null;
  completedCount: number | null;
  targetCount: number | null;
};

const getRunDate = (run: RunMetric) => {
  const candidate = run.runDate ?? run.launchedAt ?? null;
  if (!candidate) return null;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getRunRangeGranularity = (range: { start: Date; end: Date }): BucketGranularity => {
  const days = Math.max(1, differenceInCalendarDays(endOfDay(range.end), startOfDay(range.start)) + 1);
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
};

const buildRunBucketStarts = (range: { start: Date; end: Date }, granularity: BucketGranularity) => {
  const starts: Date[] = [];
  if (granularity === "month") {
    let cursor = startOfMonth(range.start);
    const end = startOfMonth(range.end);
    while (cursor <= end) {
      starts.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    return starts;
  }
  if (granularity === "week") {
    let cursor = startOfWeek(range.start, { weekStartsOn: 1 });
    const end = startOfWeek(range.end, { weekStartsOn: 1 });
    while (cursor <= end) {
      starts.push(cursor);
      cursor = addWeeks(cursor, 1);
    }
    return starts;
  }
  let cursor = startOfDay(range.start);
  const end = startOfDay(range.end);
  while (cursor <= end) {
    starts.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return starts;
};

const getRunBucketKey = (date: Date, granularity: BucketGranularity) => {
  if (granularity === "month") return startOfMonth(date).toISOString().slice(0, 7);
  if (granularity === "week") return startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  return startOfDay(date).toISOString().slice(0, 10);
};

const addToBucket = (map: Map<string, BucketAggregate>, key: string, value: number) => {
  const entry = map.get(key) ?? { sum: 0, count: 0 };
  entry.sum += value;
  entry.count += 1;
  map.set(key, entry);
};

const buildRunTrendSeries = (
  buckets: Map<string, BucketAggregate>,
  bucketStarts: Date[],
  locale: AnalysisLocale,
  granularity: BucketGranularity
) => {
  if (!bucketStarts.length) return [];
  const labelOptions =
    granularity === "month"
      ? ({ month: "short" } as const)
      : ({ month: "short", day: "numeric" } as const);
  return bucketStarts
    .map((start) => {
      const key = getRunBucketKey(start, granularity);
      const agg = buckets.get(key);
      if (!agg || !agg.count) return null;
      const value = agg.sum / agg.count;
      return {
        label: start.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", labelOptions),
        value: Number(value.toFixed(1)),
        date: start.toISOString(),
      };
    })
    .filter((point): point is { label: string; value: number; date?: string } => Boolean(point));
};

const buildStatsForRuns = (runs: RunMetric[], locale: AnalysisLocale, range: { start: Date; end: Date }): StatsResult => {
  const granularity = getRunRangeGranularity(range);
  const bucketStarts = buildRunBucketStarts(range, granularity);
  const bucketTotalsOverall = new Map<string, BucketAggregate>();
  const bucketTotalsStress = new Map<string, BucketAggregate>();
  const bucketTotalsEngagement = new Map<string, BucketAggregate>();
  const stressValues: number[] = [];
  const engagementValues: number[] = [];
  const overallValues: number[] = [];
  let lastResponseAt: Date | null = null;
  let sampleSizeTotal = 0;

  runs.forEach((run) => {
    const date = getRunDate(run);
    if (!date || date < range.start || date > range.end) return;
    if (!lastResponseAt || date > lastResponseAt) lastResponseAt = date;
    sampleSizeTotal += Number(run.completedCount ?? 0);

    const stress = typeof run.avgStressIndex === "number" ? run.avgStressIndex : null;
    const engagement = typeof run.avgEngagementScore === "number" ? run.avgEngagementScore : null;
    const overall = getDisplayStressIndex(stress ?? null, engagement ?? null);
    const bucketKey = getRunBucketKey(date, granularity);

    if (stress != null && Number.isFinite(stress)) {
      stressValues.push(stress);
      addToBucket(bucketTotalsStress, bucketKey, stress);
    }
    if (engagement != null && Number.isFinite(engagement)) {
      engagementValues.push(engagement);
      addToBucket(bucketTotalsEngagement, bucketKey, engagement);
    }
    if (overall != null && Number.isFinite(overall)) {
      overallValues.push(overall);
      addToBucket(bucketTotalsOverall, bucketKey, overall);
    }
  });

  const stressCount = stressValues.length;
  const engagementCount = engagementValues.length;
  const overallCount = overallValues.length;
  const stressAvg = stressCount ? stressValues.reduce((a, b) => a + b, 0) / stressCount : 0;
  const engagementAvg = engagementCount ? engagementValues.reduce((a, b) => a + b, 0) / engagementCount : 0;
  const overallAvg = overallCount ? overallValues.reduce((a, b) => a + b, 0) / overallCount : 0;

  const overallTrend = buildRunTrendSeries(bucketTotalsOverall, bucketStarts, locale, granularity);
  const stressTrend = buildRunTrendSeries(bucketTotalsStress, bucketStarts, locale, granularity);
  const engagementTrend = buildRunTrendSeries(bucketTotalsEngagement, bucketStarts, locale, granularity);

  const driverAverages = {} as StatsResult["driverAverages"];
  getDriverKeys().forEach((key) => {
    driverAverages[key] = { avg: 0, count: 0, trend: [] };
  });

  return {
    sampleSizeTotal: sampleSizeTotal > 0 ? sampleSizeTotal : overallCount,
    lastResponseAt,
    overallAvg: Number(overallAvg.toFixed(2)),
    overallCount,
    overallTrend,
    stressAvg: Number(stressAvg.toFixed(2)),
    stressCount,
    engagementAvg: Number(engagementAvg.toFixed(2)),
    engagementCount,
    stressTrend,
    engagementTrend,
    driverAverages,
  };
};

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const user = auth.user;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { scope, locale, from, to, teamId, scopeId } = parsed.data as {
    scope: AnalysisScope;
    locale: AnalysisLocale;
    from: string;
    to: string;
    teamId?: string;
    scopeId?: string;
  };

  const role = normalizeRole((user as any)?.role);
  const isAdminLike = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  if (scope === "org" && !isAdminLike) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (scope === "team" && role === "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let scopedTeamId: string | null = null;
  if (scope === "team") {
    const candidateRaw = typeof teamId === "string" && teamId.trim() ? teamId : scopeId;
    const candidate = typeof candidateRaw === "string" ? candidateRaw.trim() : "";
    if (!candidate) {
      return NextResponse.json({ error: "Team is required" }, { status: 400 });
    }
    const team = await prisma.team.findFirst({
      where: { id: candidate, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (!isAdminLike) {
      const membership = await prisma.userTeam.findFirst({
        where: { userId: user.id, teamId: candidate },
        select: { teamId: true },
      });
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    scopedTeamId = team.id;
  }

  const orgCreatedAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : undefined;
  const gateStatus = await getBillingGateStatus(user.organizationId, orgCreatedAt);
  if (!gateStatus.hasPaidAccess && !env.isDev) {
    return NextResponse.json({ error: "payment_required", disabled: true }, { status: 402 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`ai:analyze:${user.id}:${ip}`, { limit: 10, windowMs: 5 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const baseWhere: any = {
    run: { orgId: user.organizationId },
  };

  if (scope === "user") {
    if (user.member?.id) {
      baseWhere.memberId = user.member.id;
    } else if (user.email) {
      baseWhere.respondentEmail = user.email;
    } else {
      return NextResponse.json({ error: "User scope unavailable" }, { status: 400 });
    }
  }
  if (scope === "team" && scopedTeamId) {
    baseWhere.OR = [
      { run: { teamId: scopedTeamId } },
      { member: { teamId: scopedTeamId, organizationId: user.organizationId } },
    ];
  }

  const latestResponse = await prisma.surveyResponse.findFirst({
    where: baseWhere,
    orderBy: { submittedAt: "desc" },
    select: { submittedAt: true },
  });

  const ranges = parseRange(from, to);
  if (!ranges) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const buildResponseRangeWhere = (range: { start: Date; end: Date }) => ({
    AND: [
      baseWhere,
      {
        OR: [
          { submittedAt: { gte: range.start, lte: range.end } },
          { run: { runDate: { gte: range.start, lte: range.end } } },
        ],
      },
    ],
  });

  const cacheKeyScope = scope === "user" ? user.id : scope === "team" ? scopedTeamId ?? "team" : "all";
  const cacheKey = [
    "ai",
    "analysis",
    "v5",
    user.organizationId,
    scope,
    cacheKeyScope,
    from,
    to,
    locale,
    latestResponse?.submittedAt ? latestResponse.submittedAt.getTime() : "none",
  ].join(":");

  const useCache = !env.isDev;
  if (useCache) {
    const cached = await getCache<AnalysisPayload>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  const include = { run: { include: { template: { include: { questions: true } } } } };

  const currentResponsesRaw = await prisma.surveyResponse.findMany({
    where: buildResponseRangeWhere(ranges.current),
    include,
    orderBy: { submittedAt: "desc" },
  });
  const currentResponses = Array.isArray(currentResponsesRaw) ? currentResponsesRaw : [];

  const previousResponsesRaw = await prisma.surveyResponse.findMany({
    where: buildResponseRangeWhere(ranges.previous),
    include,
    orderBy: { submittedAt: "desc" },
  });
  const previousResponses = Array.isArray(previousResponsesRaw) ? previousResponsesRaw : [];

  let currentStats = computeStatsForResponses(currentResponses, locale, ranges.current);
  let previousStats = computeStatsForResponses(previousResponses, locale, ranges.previous);

  const runsWhere: any = { orgId: user.organizationId };
  if (scope === "user" && user.member?.id) {
    runsWhere.memberId = user.member.id;
  }
  if (scope === "team" && scopedTeamId) {
    runsWhere.OR = [
      { teamId: scopedTeamId },
      { member: { teamId: scopedTeamId, organizationId: user.organizationId } },
    ];
  }

  const runsInRange =
    scope === "user" && !user.member?.id
      ? []
      : await prisma.surveyRun.findMany({
          where: {
            ...runsWhere,
            OR: [
              { runDate: { gte: ranges.previous.start, lte: ranges.current.end } },
              { runDate: null, launchedAt: { gte: ranges.previous.start, lte: ranges.current.end } },
            ],
          },
          select: {
            runDate: true,
            launchedAt: true,
            avgStressIndex: true,
            avgEngagementScore: true,
            completedCount: true,
            targetCount: true,
          },
        });

  const getRunDateForRange = (run: RunMetric) => getRunDate(run);
  const currentRuns = runsInRange.filter((run) => {
    const date = getRunDateForRange(run);
    return Boolean(date && date >= ranges.current.start && date <= ranges.current.end);
  });
  const previousRuns = runsInRange.filter((run) => {
    const date = getRunDateForRange(run);
    return Boolean(date && date >= ranges.previous.start && date <= ranges.previous.end);
  });

  const currentRunStats = buildStatsForRuns(currentRuns, locale, ranges.current);
  const previousRunStats = buildStatsForRuns(previousRuns, locale, ranges.previous);
  const responseCount = currentResponses.length;
  const runSampleSize = currentRunStats.sampleSizeTotal;
  const hasAnySamples = responseCount > 0 || runSampleSize > 0;
  const shouldUseRunStats = currentStats.sampleSizeTotal === 0 && currentRunStats.sampleSizeTotal > 0;

  if (shouldUseRunStats) {
    currentStats = currentRunStats;
    if (previousRunStats.sampleSizeTotal > 0) {
      previousStats = previousRunStats;
    }
  }

  const computed = buildComputedMetrics(currentStats, previousStats, locale);

  const meta = {
    locale,
    scope,
    dateFrom: ranges.current.start.toISOString().slice(0, 10),
    dateTo: ranges.current.end.toISOString().slice(0, 10),
    sampleSizeTotal: hasAnySamples
      ? Math.max(currentStats.sampleSizeTotal, responseCount, runSampleSize)
      : 0,
  };

  const computedInput = {
    meta,
    computed: {
      topCards: computed.topCards.map((c) => ({
        key: c.key,
        avgScore: c.avgScore,
        delta: c.delta,
        sampleSize: c.sampleSize,
      })),
      drivers: computed.drivers.map((d) => ({
        key: d.key,
        label: d.label,
        avgScore: d.avgScore,
        delta: d.delta,
        sampleSize: d.sampleSize,
      })),
    },
  };

  const engagementMetric = computed.topCards.find((c) => c.key === "engagement");
  const stressMetric = computed.topCards.find((c) => c.key === "stress");

  const drivers: DriverMetric[] = computed.drivers.map((driver) => ({
    key: driver.key,
    label: driver.label,
    avgScore: driver.avgScore,
    delta: driver.delta,
    sampleSize: driver.sampleSize,
  }));
  const hasDriverData = drivers.some((driver) => driver.sampleSize > 0);

  const totals = currentRuns.reduce(
    (acc, run) => {
      acc.target += Number(run.targetCount ?? 0);
      acc.completed += Number(run.completedCount ?? 0);
      return acc;
    },
    { target: 0, completed: 0 }
  );
  const participationRate = totals.target > 0 ? Math.round((totals.completed / totals.target) * 100) : 0;

  const positiveDrivers = hasDriverData ? pickDrivers(drivers, "positive") : [];
  const riskDrivers = hasDriverData ? pickDrivers(drivers, "risk") : [];

  const driversPositive = positiveDrivers.map((driver) => ({
    name: driver.label,
    score: driver.avgScore,
    delta: driver.delta,
    sentiment: "positive" as const,
  }));

  const driversRisk = riskDrivers.map((driver) => ({
    name: driver.label,
    score: driver.avgScore,
    delta: driver.delta,
    sentiment: "risk" as const,
  }));

  const periodLabel = formatPeriodLabel(meta.dateFrom, meta.dateTo, locale);
  const avgStress = stressMetric?.avgScore ?? 0;
  const avgEngagement = engagementMetric?.avgScore ?? 0;
  const deltaStress = stressMetric?.delta ?? 0;
  const deltaEngagement = engagementMetric?.delta ?? 0;
  const trendPoints = (stressMetric?.trendPoints?.length ? stressMetric.trendPoints : engagementMetric?.trendPoints ?? []) as any;
  const trendBase = stressMetric?.avgScore ?? avgStress;
  const trends = ensureTrendPoints(
    trendPoints,
    trendBase,
    { from: meta.dateFrom, to: meta.dateTo },
    locale
  );

  const audience: "employee" | "manager" = scope === "user" ? "employee" : "manager";

  const report: AiEngagementReport = {
    period: { from: meta.dateFrom, to: meta.dateTo },
    isEmpty: !hasAnySamples,
    summary:
      locale === "ru"
        ? `Период ${periodLabel}: вовлеченность ${avgEngagement.toFixed(1)}/10, стресс ${avgStress.toFixed(1)}/10.`
        : `Period ${periodLabel}: engagement ${avgEngagement.toFixed(1)}/10, stress ${avgStress.toFixed(1)}/10.`,
    snapshotNote: t(locale, "aiSampleSizeNote").replace("{{count}}", String(meta.sampleSizeTotal)),
    avgStress,
    avgEngagement,
    deltaStress,
    deltaEngagement,
    trends,
    trendInsight: buildTrendInsight(deltaStress, locale),
    driversPositive,
    driversRisk,
    driversSummary: buildDriversSummary(driversPositive, driversRisk, locale),
    teamsFocus: [],
    participationRate: Math.max(0, Math.min(100, participationRate)),
    participationNote: buildParticipationNote(participationRate, locale),
    managerFocus: buildFocusFallback(riskDrivers, locale, audience),
    nudges: buildNudgesFallback(riskDrivers, locale, audience),
    disclaimer: t(locale, "aiDisclaimerText"),
  };

  const driverByKey = new Map(drivers.map((driver) => [driver.key, driver]));
  const driverKeyByLabel = new Map(
    drivers.map((driver) => [driver.label.toLowerCase(), driver.key])
  );

  const resolveDriverKey = (value: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    if (driverByKey.has(raw)) return raw;
    const normalized = raw.toLowerCase();
    return driverKeyByLabel.get(normalized) ?? null;
  };

  const buildDriverList = (
    keys: string[],
    sentiment: DriverSentiment,
    fallback: typeof report.driversPositive,
    exclude: Set<string> = new Set()
  ) => {
    const resolved = keys
      .map(resolveDriverKey)
      .filter((key): key is string => Boolean(key) && !exclude.has(key));
    const unique = Array.from(new Set(resolved));
    const items = unique.map((key) => {
      const driver = driverByKey.get(key)!;
      return {
        name: driver.label,
        score: driver.avgScore,
        delta: driver.delta,
        sentiment,
      };
    });
    return fillList(items, fallback, 3);
  };

  const normalizeAiDrivers = (aiDrivers: z.infer<typeof aiTextSchema>["drivers"]) => {
    const positiveKeys = normalizeStringArray(aiDrivers?.positive);
    const riskKeys = normalizeStringArray(aiDrivers?.risk);
    const positives = buildDriverList(positiveKeys, "positive", report.driversPositive);
    const exclude = new Set(
      positives
        .map((item) => resolveDriverKey(item.name))
        .filter((key): key is string => Boolean(key))
    );
    const risks = buildDriverList(riskKeys, "risk", report.driversRisk, exclude);
    const summary = normalizeText(aiDrivers?.summary, buildDriversSummary(positives, risks, locale));
    return { positives, risks, summary };
  };

  let ok = true;
  let error: string | undefined;

  if (meta.sampleSizeTotal > 0 && env.OPENAI_API_KEY && hasDriverData) {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const systemPrompt =
      locale === "ru"
        ? "Ты HR-аналитик. Сгенерируй краткие рекомендации без цифр. Верни строго JSON по схеме без Markdown."
        : "You are an HR analyst. Generate concise recommendations without numbers. Return strict JSON per the schema, no Markdown.";
    const userPrompt =
      locale === "ru"
        ? `Данные (JSON):\n${JSON.stringify({
            meta,
            computed: computedInput.computed,
            drivers,
            audience,
          })}\n\nВерни JSON:
{
  managerFocus: Array<{ title, tags, description? }>,
  nudges: Array<{ text, tags?, steps? }>,
  drivers: {
    positive: Array<string>,
    risk: Array<string>,
    summary?: string
  }
}
Требования:
- По 3 элемента в каждом массиве.
- tags: используй ключи драйверов (key) где возможно.
- drivers.positive/risk: только ключи драйверов из входных данных (key), без названий.
- drivers.summary: 1 короткая фраза без чисел.
- Рекомендации должны соответствовать роли (сотрудник = личные действия, менеджер = действия для команды).
- Никаких чисел и новых метрик.`
        : `Data (JSON):\n${JSON.stringify({
            meta,
            computed: computedInput.computed,
            drivers,
            audience,
          })}\n\nReturn JSON:
{
  managerFocus: Array<{ title, tags, description? }>,
  nudges: Array<{ text, tags?, steps? }>,
  drivers: {
    positive: Array<string>,
    risk: Array<string>,
    summary?: string
  }
}
Requirements:
- 3 items per array.
- tags: use driver keys where possible.
- drivers.positive/risk: only driver keys from the input data.
- drivers.summary: 1 short sentence with no numbers.
- Recommendations must match the audience (employee = personal actions, manager = team actions).
- No numbers and no new metrics.`;

    const requestAiText = async (model: string) => {
      const response = await client.responses.create({
        model,
        instructions: systemPrompt,
        input: [{ role: "user", content: userPrompt }],
        max_output_tokens: 900,
        text: { format: { type: "json_object" } },
      });
      if ((response as any)?.status === "incomplete") {
        throw new Error("AI_RESPONSE_INCOMPLETE");
      }
      const text = extractOutputText(response);
      if (!text) throw new Error("AI_RESPONSE_EMPTY");
      const jsonText = extractJsonPayload(text);
      const json = JSON.parse(jsonText);
      const parsed = aiTextSchema.safeParse(json);
      if (!parsed.success) throw new Error("AI_RESPONSE_INVALID");
      return parsed.data;
    };

    const normalizeAiFocus = (items: z.infer<typeof aiTextSchema>["managerFocus"], fallback: typeof report.managerFocus) =>
      fillList(items, fallback, 3).map((item, index) => ({
        title: normalizeText(item.title, fallback[index]?.title ?? "Focus"),
        tags: normalizeStringArray(item.tags, fallback[index]?.tags ?? []),
        description: normalizeText(item.description, fallback[index]?.description ?? ""),
      }));

    const normalizeAiNudges = (items: z.infer<typeof aiTextSchema>["nudges"], fallback: typeof report.nudges) =>
      fillList(items, fallback, 3).map((item, index) => ({
        text: normalizeText(item.text, fallback[index]?.text ?? "Action"),
        tags: normalizeStringArray(item.tags, fallback[index]?.tags ?? []),
        steps: normalizeStringArray(item.steps, fallback[index]?.steps ?? []),
      }));

    const primaryModel = env.AI_MODEL_SUMMARY ?? "gpt-5-mini";
    const fallbackModel = env.AI_MODEL_SUMMARY_FALLBACK ?? "gpt-4o-mini";

    try {
      const parsed = await requestAiText(primaryModel);
      report.managerFocus = normalizeAiFocus(parsed.managerFocus, report.managerFocus);
      report.nudges = normalizeAiNudges(parsed.nudges, report.nudges);
      const normalizedDrivers = normalizeAiDrivers(parsed.drivers);
      report.driversPositive = normalizedDrivers.positives;
      report.driversRisk = normalizedDrivers.risks;
      report.driversSummary = normalizedDrivers.summary;
    } catch {
      if (fallbackModel !== primaryModel) {
        try {
          const parsed = await requestAiText(fallbackModel);
          report.managerFocus = normalizeAiFocus(parsed.managerFocus, report.managerFocus);
          report.nudges = normalizeAiNudges(parsed.nudges, report.nudges);
          const normalizedDrivers = normalizeAiDrivers(parsed.drivers);
          report.driversPositive = normalizedDrivers.positives;
          report.driversRisk = normalizedDrivers.risks;
          report.driversSummary = normalizedDrivers.summary;
        } catch {
          ok = true;
          error = "AI_TEXT_FAILED";
        }
      } else {
        ok = true;
        error = "AI_TEXT_FAILED";
      }
    }
  }

  if (report.isEmpty) {
    report.summary = "";
    report.snapshotNote = "";
    report.trendInsight = "";
    report.driversSummary = "";
    report.trends = [];
    report.driversPositive = [];
    report.driversRisk = [];
    report.participationRate = 0;
    report.participationNote = buildParticipationNote(0, locale);
    report.managerFocus = [];
    report.nudges = [];
  }

  const ai = {
    summary: report.summary,
    focus: [],
    pros: [],
    cons: [],
    actions: [],
  };

  const payload: AnalysisPayload = {
    ok,
    meta,
    computed,
    ai,
    report,
    ...(error ? { error } : {}),
  };

  if (useCache) {
    const ttlSeconds = meta.sampleSizeTotal > 0 ? 900 : 60;
    await setCache(cacheKey, payload, ttlSeconds);
  }
  return NextResponse.json(payload);
}
