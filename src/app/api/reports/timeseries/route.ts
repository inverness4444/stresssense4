import { NextResponse } from "next/server";
import { z } from "zod";
import { endOfDay, startOfDay } from "date-fns";
import { assertSameOrigin, requireApiUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { computeStatsForResponses } from "@/lib/ai/analysisAggregates";
import { scoreAnswer } from "@/lib/stressScoring";
import type { AnalysisLocale, ReportScope } from "@/lib/ai/analysisTypes";

const bodySchema = z.object({
  scope: z.enum(["user", "team", "org"]),
  locale: z.enum(["ru", "en"]),
  from: z.string(),
  to: z.string(),
  teamId: z.string().optional(),
  scopeId: z.string().optional(),
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
  return { start, end };
}

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
    scope: ReportScope;
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

  const range = parseRange(from, to);
  if (!range) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
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

  const include = { run: { include: { template: { include: { questions: true } } } } };
  const responses = await prisma.surveyResponse.findMany({
    where: {
      AND: [
        baseWhere,
        {
          OR: [
            { submittedAt: { gte: range.start, lte: range.end } },
            { run: { runDate: { gte: range.start, lte: range.end } } },
          ],
        },
      ],
    },
    include,
    orderBy: { submittedAt: "asc" },
  });

  const stats = computeStatsForResponses(responses, locale, range);
  const trendSource =
    stats.overallTrend.length > 0
      ? stats.overallTrend
      : stats.stressTrend.length > 0
        ? stats.stressTrend
        : stats.engagementTrend;

  const buildResponseSeries = () => {
    if (responses.length < 2) return trendSource;
    const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" });
    const timeFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" });
    const responseDates = responses
      .map((resp) => resp.submittedAt ? new Date(resp.submittedAt) : resp.run?.runDate ? new Date(resp.run.runDate) : null)
      .filter((d): d is Date => Boolean(d && !Number.isNaN(d.getTime())));
    const firstKey = responseDates[0] ? responseDates[0].toISOString().slice(0, 10) : null;
    const sameDay = firstKey ? responseDates.every((d) => d.toISOString().slice(0, 10) === firstKey) : false;

    const points = responses.map((resp) => {
      const date = resp.submittedAt ? new Date(resp.submittedAt) : resp.run?.runDate ? new Date(resp.run.runDate) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      const questions = resp.run?.template?.questions ?? [];
      const questionMap = new Map<string, any>();
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
      let sum = 0;
      let count = 0;
      for (const [questionId, answer] of Object.entries(answers)) {
        const question = questionMap.get(questionId);
        const scored = scoreAnswer(answer, question);
        if (!scored) continue;
        sum += scored.stressScore;
        count += 1;
      }
      if (!count) return null;
      const value = Number((sum / count).toFixed(1));
      const label = sameDay ? timeFormatter.format(date) : dateFormatter.format(date);
      return { label, value, date: date.toISOString() };
    }).filter(Boolean) as { label: string; value: number; date?: string }[];

    return points.length >= 2 ? points : trendSource;
  };

  const points = trendSource.length < 2 ? buildResponseSeries() : trendSource;

  return NextResponse.json({
    ok: true,
    points,
    sampleSize: stats.sampleSizeTotal,
  });
}
