import { prisma } from "@/lib/prisma";
import { analyseEngagementWithAI } from "@/lib/surveyInsightsAI";

type TimeseriesPoint = { date: string; score: number; responsesCount: number };

export async function computeEngagementScoreFromResponses(params: {
  orgId: string;
  teamId?: string;
  surveyIds?: string[];
  from: Date;
  to: Date;
}) {
  const answers = await prisma.surveyAnswer.findMany({
    where: {
      response: {
        survey: { organizationId: params.orgId, id: params.surveyIds ? { in: params.surveyIds } : undefined },
        submittedAt: { gte: params.from, lte: params.to },
        inviteToken: params.teamId ? { user: { teams: { some: { teamId: params.teamId } } } } : undefined,
      },
    },
    include: { question: true, response: true },
  });

  const numericSamples: number[] = [];
  const textSamples: string[] = [];
  const timeseriesMap = new Map<string, { scoreSum: number; count: number }>();

  for (const a of answers) {
    if (a.scaleValue !== null && a.question.scaleMax) {
      const normalized = normalizeScale(a.scaleValue, a.question.scaleMin ?? 1, a.question.scaleMax ?? 5);
      numericSamples.push(normalized);
      const key = a.response.submittedAt.toISOString().slice(0, 10);
      const entry = timeseriesMap.get(key) ?? { scoreSum: 0, count: 0 };
      entry.scoreSum += normalized;
      entry.count += 1;
      timeseriesMap.set(key, entry);
    }
    if (a.textValue) {
      textSamples.push(a.textValue);
    }
  }

  const baseScore = numericSamples.length ? average(numericSamples) : 0;
  const timeseries: TimeseriesPoint[] = Array.from(timeseriesMap.entries()).map(([date, v]) => ({
    date,
    score: v.scoreSum / v.count,
    responsesCount: v.count,
  }));

  const ai = await analyseEngagementWithAI({
    numericSamples,
    textSamples,
    baseScore,
    timeseries: timeseries.map((t) => ({ date: t.date, baseScore: t.score, responsesCount: t.responsesCount })),
    questionMeta: {},
  });

  return {
    score: ai.adjustedScore ?? baseScore,
    drivers: ai.drivers ?? [],
    timeseries: ai.adjustedTimeseries ?? timeseries,
    baseScore,
    responsesCount: numericSamples.length,
  };
}

export async function getEngagementReport(params: { orgId: string; teamId?: string; surveyId?: string }) {
  const snapshot = await prisma.surveyEngagementSnapshot.findFirst({
    where: {
      organizationId: params.orgId,
      teamId: params.teamId ?? undefined,
      surveyId: params.surveyId ?? undefined,
    },
    orderBy: { periodEnd: "desc" },
    include: { timeseries: true },
  });

  if (!snapshot) {
    // fallback: compute on the fly for last 90 days
    const to = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const computed = await computeEngagementScoreFromResponses({ orgId: params.orgId, teamId: params.teamId, surveyIds: params.surveyId ? [params.surveyId] : undefined, from, to });
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: params.orgId } });
    if ((settings?.minResponsesForBreakdown ?? 4) > computed.responsesCount) {
      return { insufficientSample: true };
    }
    return {
      score: computed.score,
      delta: 0,
      deltaDirection: "up",
      responsesCount: computed.responsesCount,
      periodLabel: `${from.toISOString().slice(0, 10)} – ${to.toISOString().slice(0, 10)}`,
      timeseries: computed.timeseries.map((t: { date: string; score: number }) => ({ date: t.date, score: t.score })),
      drivers: computed.drivers,
      summary: "Engagement estimated from recent responses.",
    };
  }

  return {
    score: snapshot.engagementScore,
    delta: snapshot.delta ?? 0,
    deltaDirection: (snapshot.delta ?? 0) >= 0 ? "up" : "down",
    responsesCount: snapshot.responsesCount,
    periodLabel: `${snapshot.periodStart.toISOString().slice(0, 10)} – ${snapshot.periodEnd.toISOString().slice(0, 10)}`,
    timeseries: snapshot.timeseries.map((t) => ({ date: t.date.toISOString().slice(0, 10), score: t.score })),
    drivers: Array.isArray(snapshot.drivers) ? snapshot.drivers : [],
  };
}

function normalizeScale(val: number, min: number, max: number) {
  const clamped = Math.max(min, Math.min(max, val));
  const normalized = ((clamped - min) / (max - min)) * 10;
  return normalized;
}

function average(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
