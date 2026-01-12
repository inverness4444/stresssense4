import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { AnalysisLocale, ComputedDriver, ComputedMetric, PeriodKey, TrendPoint } from "@/lib/ai/analysisTypes";
import {
  computeOverallStressFromDrivers,
  isKnownDriverKey,
  scoreAnswer,
  type DriverKey,
} from "@/lib/stressScoring";

type DriverDefinition = {
  key: DriverKey;
  label: { ru: string; en: string };
  description: { ru: string; en: string };
};

type QuestionLike = {
  id: string;
  type?: string | null;
  dimension?: string | null;
  driverKey?: string | null;
  driverTag?: string | null;
  polarity?: string | null;
  scaleMin?: number | null;
  scaleMax?: number | null;
};

type ResponseLike = {
  submittedAt: Date;
  answers: any;
  run?: {
    template?: { questions?: QuestionLike[] };
    runDate?: Date | string | null;
    runType?: string | null;
  } | null;
};

const DRIVER_DEFS: DriverDefinition[] = [
  {
    key: "workload_deadlines",
    label: { ru: "Нагрузка и дедлайны", en: "Workload & deadlines" },
    description: { ru: "Как ощущается объём задач и сроки.", en: "How workload and deadlines feel." },
  },
  {
    key: "clarity_priorities",
    label: { ru: "Ясность задач и приоритетов", en: "Clarity of priorities" },
    description: { ru: "Насколько понятны цели и ожидания.", en: "How clear goals and expectations are." },
  },
  {
    key: "manager_support",
    label: { ru: "Поддержка менеджера", en: "Manager support" },
    description: { ru: "Можно ли открыто говорить о стрессе и получать помощь.", en: "Ability to discuss stress and get help." },
  },
  {
    key: "meetings_focus",
    label: { ru: "Фокус и митинги", en: "Focus & meetings" },
    description: { ru: "Есть ли время на глубокую работу без встреч.", en: "Time for deep work without constant meetings." },
  },
  {
    key: "psychological_safety",
    label: { ru: "Психологическая безопасность", en: "Psychological safety" },
    description: { ru: "Насколько безопасно говорить о проблемах.", en: "How safe it is to raise issues." },
  },
  {
    key: "recovery_energy",
    label: { ru: "Восстановление и энергия", en: "Recovery & energy" },
    description: { ru: "Хватает ли энергии и времени на восстановление.", en: "Energy levels and time to recover." },
  },
  {
    key: "autonomy_control",
    label: { ru: "Контроль и автономия", en: "Autonomy & control" },
    description: { ru: "Насколько много самостоятельности и влияния на работу.", en: "Ability to control how work is done." },
  },
  {
    key: "recognition_feedback",
    label: { ru: "Признание и обратная связь", en: "Recognition & feedback" },
    description: { ru: "Чувствуется ли поддержка и справедливость.", en: "Perceived recognition and fairness." },
  },
  {
    key: "process_clarity",
    label: { ru: "Процессы и ясность", en: "Process clarity" },
    description: { ru: "Насколько процессы помогают, а не мешают.", en: "Whether processes support work." },
  },
  {
    key: "long_term_outlook",
    label: { ru: "Долгосрочная перспектива", en: "Long-term outlook" },
    description: { ru: "Есть ли ощущение устойчивости и смысла.", en: "Sustainability and long-term outlook." },
  },
];

const ENGAGEMENT_DIMENSIONS = new Set([
  "engagement",
  "clarity",
  "recognition",
  "psych_safety",
  "manager_support",
  "meetings_focus",
  "control",
  "safety",
  "atmosphere",
]);

type BucketAggregate = { sum: number; count: number };

type StatsResult = {
  sampleSizeTotal: number;
  lastResponseAt: Date | null;
  overallAvg: number;
  overallCount: number;
  overallTrend: TrendPoint[];
  stressAvg: number;
  stressCount: number;
  engagementAvg: number;
  engagementCount: number;
  stressTrend: TrendPoint[];
  engagementTrend: TrendPoint[];
  driverAverages: Record<DriverKey, { avg: number; count: number; trend: TrendPoint[] }>;
};

type BucketGranularity = "day" | "week" | "month";

function getHalfYearRange(anchor: Date) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth(); // 0-11
  if (month <= 5) {
    const start = startOfDay(new Date(year, 0, 1));
    const end = endOfDay(new Date(year, 6, 0)); // June 30
    return { start, end };
  }
  const start = startOfDay(new Date(year, 6, 1)); // July 1
  const end = endOfDay(new Date(year, 12, 0)); // Dec 31
  return { start, end };
}

export function getPeriodRanges(period: PeriodKey, now: Date = new Date()) {
  const today = new Date(now);
  let start: Date;
  let end: Date;

  if (period === "week") {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    start = startOfDay(weekStart);
    end = endOfDay(addDays(start, 6)); // Monday -> Sunday
  } else if (period === "month") {
    start = startOfDay(startOfMonth(today));
    end = endOfDay(endOfMonth(today));
  } else if (period === "quarter") {
    start = startOfDay(startOfQuarter(today));
    end = endOfDay(endOfQuarter(today));
  } else if (period === "half") {
    const range = getHalfYearRange(today);
    start = range.start;
    end = range.end;
  } else {
    start = startOfDay(startOfYear(today));
    end = endOfDay(endOfYear(today));
  }

  let prevStart: Date;
  let prevEnd: Date;
  if (period === "week") {
    prevStart = startOfDay(addDays(start, -7));
    prevEnd = endOfDay(addDays(prevStart, 6));
  } else if (period === "month") {
    const prev = addMonths(start, -1);
    prevStart = startOfDay(startOfMonth(prev));
    prevEnd = endOfDay(endOfMonth(prev));
  } else if (period === "quarter") {
    const prev = addMonths(start, -3);
    prevStart = startOfDay(startOfQuarter(prev));
    prevEnd = endOfDay(endOfQuarter(prev));
  } else if (period === "half") {
    const prev = addMonths(start, -6);
    const range = getHalfYearRange(prev);
    prevStart = range.start;
    prevEnd = range.end;
  } else {
    const prev = addYears(start, -1);
    prevStart = startOfDay(startOfYear(prev));
    prevEnd = endOfDay(endOfYear(prev));
  }

  return {
    current: { start, end },
    previous: { start: prevStart, end: prevEnd },
  };
}

export function computeStatsForResponses(
  responses: ResponseLike[],
  locale: AnalysisLocale,
  range: { start: Date; end: Date }
): StatsResult {
  const bucketGranularity = getRangeBucketGranularity(range);
  const bucketTotalsOverall = new Map<string, BucketAggregate>();
  const bucketTotalsEngagement = new Map<string, BucketAggregate>();
  const bucketTotalsStressFallback = new Map<string, BucketAggregate>();
  const bucketTotalsDrivers = new Map<DriverKey, Map<string, BucketAggregate>>();
  const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
  const engagementTotals = { sum: 0, count: 0 };
  const overallTotals = { sum: 0, count: 0 };

  const sampleSizeTotal = responses.length;
  const lastResponseAt = responses.length ? responses[0]?.submittedAt ?? null : null;

  responses.forEach((resp) => {
    const submittedAt = resp.submittedAt ? new Date(resp.submittedAt) : null;
    const runDate = resp.run?.runType === "daily" && resp.run?.runDate ? new Date(resp.run.runDate) : null;
    const bucketDate = runDate ?? submittedAt;
    if (!bucketDate || Number.isNaN(bucketDate.getTime())) return;
    const bucketKey = getBucketKey(bucketDate, bucketGranularity);

    const questions = resp.run?.template?.questions ?? [];
    const questionMap = new Map<string, QuestionLike>();
    questions.forEach((q) => questionMap.set(q.id, q));

    const answersRaw = resp.answers;
    const answers: Record<string, any> = Array.isArray(answersRaw)
      ? answersRaw.reduce((acc: Record<string, any>, item: any) => {
          if (item?.questionId) acc[item.questionId] = item;
          return acc;
        }, {})
      : typeof answersRaw === "object" && answersRaw !== null
        ? answersRaw
        : {};

    let responseSum = 0;
    let responseCount = 0;
    for (const [questionId, answer] of Object.entries(answers)) {
      const question = questionMap.get(questionId);
      const scored = scoreAnswer(answer, question);
      if (!scored) continue;

      const { stressScore, engagementScore, driverKey, dimension } = scored;

      responseSum += stressScore;
      responseCount += 1;

      const driverAgg = driverTotals.get(driverKey) ?? { sum: 0, count: 0 };
      driverAgg.sum += stressScore;
      driverAgg.count += 1;
      driverTotals.set(driverKey, driverAgg);

      const driverBuckets = bucketTotalsDrivers.get(driverKey) ?? new Map<string, BucketAggregate>();
      addToBucket(driverBuckets, bucketKey, stressScore);
      bucketTotalsDrivers.set(driverKey, driverBuckets);

      addToBucket(bucketTotalsStressFallback, bucketKey, stressScore);

      if (dimension && ENGAGEMENT_DIMENSIONS.has(dimension)) {
        addToBucket(bucketTotalsEngagement, bucketKey, engagementScore);
        engagementTotals.sum += engagementScore;
        engagementTotals.count += 1;
      }
    }

    if (responseCount > 0) {
      const responseAvg = responseSum / responseCount;
      addToBucket(bucketTotalsOverall, bucketKey, responseAvg);
      overallTotals.sum += responseAvg;
      overallTotals.count += 1;
    }
  });

  const stressStats = computeOverallStressFromDrivers(driverTotals);
  const engagementAvg = engagementTotals.count ? engagementTotals.sum / engagementTotals.count : 0;

  const bucketStarts = buildBucketStarts(range, bucketGranularity);
  const overallTrend = buildTrendSeries(bucketTotalsOverall, bucketStarts, locale, bucketGranularity);
  const stressTrend =
    stressStats.driverCount > 0
      ? buildDriverTrendSeries(bucketTotalsDrivers, bucketStarts, locale, bucketGranularity)
      : buildTrendSeries(bucketTotalsStressFallback, bucketStarts, locale, bucketGranularity);
  const engagementTrend = buildTrendSeries(bucketTotalsEngagement, bucketStarts, locale, bucketGranularity);

  const driverAverages = {} as Record<DriverKey, { avg: number; count: number; trend: TrendPoint[] }>;
  DRIVER_DEFS.forEach((driver) => {
    const totals = driverTotals.get(driver.key) ?? { sum: 0, count: 0 };
    const avg = totals.count ? totals.sum / totals.count : 0;
    const buckets = bucketTotalsDrivers.get(driver.key) ?? new Map<string, BucketAggregate>();
    const trend = buildTrendSeries(buckets, bucketStarts, locale, bucketGranularity);
    driverAverages[driver.key] = { avg: Number(avg.toFixed(2)), count: totals.count, trend };
  });

  return {
    sampleSizeTotal,
    lastResponseAt,
    overallAvg: Number((overallTotals.count ? overallTotals.sum / overallTotals.count : 0).toFixed(2)),
    overallCount: overallTotals.count,
    overallTrend,
    stressAvg: Number(stressStats.avg.toFixed(2)),
    stressCount: stressStats.answerCount,
    engagementAvg: Number(engagementAvg.toFixed(2)),
    engagementCount: engagementTotals.count,
    stressTrend,
    engagementTrend,
    driverAverages,
  };
}

export function buildComputedMetrics(
  current: StatsResult,
  previous: StatsResult,
  locale: AnalysisLocale
): { topCards: ComputedMetric[]; drivers: ComputedDriver[] } {
  const topCards: ComputedMetric[] = [
    buildMetric(
      "stress",
      locale === "ru" ? "Индекс стресса" : "Stress index",
      current.stressAvg,
      current.stressCount,
      previous.stressAvg,
      previous.stressCount,
      current.stressTrend
    ),
    buildMetric(
      "engagement",
      locale === "ru" ? "Вовлечённость" : "Engagement",
      current.engagementAvg,
      current.engagementCount,
      previous.engagementAvg,
      previous.engagementCount,
      current.engagementTrend
    ),
  ];

  const drivers: ComputedDriver[] = DRIVER_DEFS.map((driver) => {
    const currentDriver = current.driverAverages[driver.key];
    const previousDriver = previous.driverAverages[driver.key];
    const delta = currentDriver && previousDriver && previousDriver.count > 0
      ? currentDriver.avg - previousDriver.avg
      : 0;
    return {
      key: driver.key,
      label: driver.label[locale],
      description: driver.description[locale],
      avgScore: Number((currentDriver?.avg ?? 0).toFixed(1)),
      delta: Number(delta.toFixed(1)),
      sampleSize: currentDriver?.count ?? 0,
      trendPoints: currentDriver?.trend ?? [],
    };
  });

  return { topCards, drivers };
}

export function getDriverKeys() {
  return DRIVER_DEFS.map((d) => d.key);
}

function buildMetric(
  key: string,
  label: string,
  avg: number,
  sampleSize: number,
  previousAvg: number,
  previousCount: number,
  trendPoints: TrendPoint[]
): ComputedMetric {
  const deltaRaw = sampleSize > 0 && previousCount > 0 ? avg - previousAvg : 0;
  const delta = Number(deltaRaw.toFixed(1));
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    key,
    label,
    avgScore: Number(avg.toFixed(1)),
    delta,
    direction,
    sampleSize,
    trendPoints,
  };
}

function addToBucket(map: Map<string, BucketAggregate>, key: string, value: number) {
  const entry = map.get(key) ?? { sum: 0, count: 0 };
  entry.sum += value;
  entry.count += 1;
  map.set(key, entry);
}

function buildBucketStarts(range: { start: Date; end: Date }, granularity: BucketGranularity) {
  const minDate = range.start;
  const maxDate = range.end;
  const starts: Date[] = [];
  if (granularity === "month") {
    let cursor = startOfMonth(minDate);
    const end = startOfMonth(maxDate);
    while (cursor <= end) {
      starts.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    return starts;
  }
  if (granularity === "week") {
    let cursor = startOfWeek(minDate, { weekStartsOn: 1 });
    const end = startOfWeek(maxDate, { weekStartsOn: 1 });
    while (cursor <= end) {
      starts.push(cursor);
      cursor = addWeeks(cursor, 1);
    }
    return starts;
  }
  let cursor = startOfDay(minDate);
  const end = startOfDay(maxDate);
  while (cursor <= end) {
    starts.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return starts;
}

function buildTrendSeries(
  buckets: Map<string, BucketAggregate>,
  bucketStarts: Date[],
  locale: AnalysisLocale,
  granularity: BucketGranularity
): TrendPoint[] {
  if (!bucketStarts.length) return [];
  const labelOptions =
    granularity === "month"
      ? ({ month: "short" } as const)
      : ({ month: "short", day: "numeric" } as const);
  return bucketStarts
    .map((start) => {
      const key = getBucketKey(start, granularity);
      const agg = buckets.get(key);
      if (!agg || !agg.count) return null;
      const value = agg.sum / agg.count;
      return {
        label: start.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", labelOptions),
        value: Number(value.toFixed(1)),
        date: start.toISOString(),
      };
    })
    .filter((point): point is TrendPoint => Boolean(point));
}

function buildDriverTrendSeries(
  driverBuckets: Map<DriverKey, Map<string, BucketAggregate>>,
  bucketStarts: Date[],
  locale: AnalysisLocale,
  granularity: BucketGranularity
): TrendPoint[] {
  if (!bucketStarts.length) return [];
  const labelOptions =
    granularity === "month"
      ? ({ month: "short" } as const)
      : ({ month: "short", day: "numeric" } as const);
  return bucketStarts
    .map((start) => {
      const key = getBucketKey(start, granularity);
      let sumDrivers = 0;
      let driverCount = 0;
      for (const [driverKey, buckets] of driverBuckets.entries()) {
        if (!isKnownDriverKey(driverKey)) continue;
        const agg = buckets.get(key);
        if (!agg || !agg.count) continue;
        sumDrivers += agg.sum / agg.count;
        driverCount += 1;
      }
      if (!driverCount) return null;
      const value = sumDrivers / driverCount;
      return {
        label: start.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", labelOptions),
        value: Number(value.toFixed(1)),
        date: start.toISOString(),
      };
    })
    .filter((point): point is TrendPoint => Boolean(point));
}

function getBucketKey(date: Date, granularity: BucketGranularity) {
  if (granularity === "month") {
    return startOfMonth(date).toISOString().slice(0, 7);
  }
  if (granularity === "week") {
    return startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  }
  return startOfDay(date).toISOString().slice(0, 10);
}

export function getDriverDefinitions(locale: AnalysisLocale) {
  return DRIVER_DEFS.map((d) => ({ key: d.key, label: d.label[locale], description: d.description[locale] }));
}

function getRangeBucketGranularity(range: { start: Date; end: Date }): BucketGranularity {
  const days = Math.max(1, differenceInCalendarDays(endOfDay(range.end), startOfDay(range.start)) + 1);
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}
