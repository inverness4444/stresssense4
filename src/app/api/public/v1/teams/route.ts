import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:teams"]);
  if ("error" in auth) return auth.error;

  type TeamRow = { id: string; name: string };
  const teams: TeamRow[] = await prisma.team.findMany({
    where: { organizationId: auth.key!.organizationId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const settings = await ensureOrgSettings(auth.key!.organizationId);
  const latestSurvey = await prisma.survey.findFirst({
    where: { organizationId: auth.key!.organizationId },
    include: {
      inviteTokens: { include: { user: { include: { teams: true } } } },
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      targets: { include: { team: true } },
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestSurvey) {
    return NextResponse.json({
      data: teams.map((team) => ({ id: team.id, name: team.name, stressIndex: 0, participation: 0 })),
    });
  }

  const minBreakdown = latestSurvey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown ?? 4;
  const questionMap = new Map(latestSurvey.questions.map((q: any) => [q.id, q]));
  const teamStats: Record<string, { stressIndex: number; participation: number }> = {};
  latestSurvey.targets.forEach((t: any) => {
    const teamResponses = latestSurvey.responses.filter((r: any) => r.inviteToken.user.teams.some((ut: any) => ut.teamId === t.teamId));
    const inviteCount = latestSurvey.inviteTokens.filter((i: any) => i.user.teams.some((ut: any) => ut.teamId === t.teamId)).length;
    if (teamResponses.length < minBreakdown) {
      teamStats[t.teamId] = { stressIndex: 0, participation: 0 };
      return;
    }
    const teamTotals = new Map<DriverKey, { sum: number; count: number }>();
    let teamFallbackSum = 0;
    let teamFallbackCount = 0;
    teamResponses.forEach((r: any) =>
      r.answers.forEach((a: any) => {
        const question = questionMap.get(a.questionId);
        if (!question) return;
        const scored = scoreAnswer(a, question);
        if (!scored) return;
        const totals = teamTotals.get(scored.driverKey) ?? { sum: 0, count: 0 };
        totals.sum += scored.stressScore;
        totals.count += 1;
        teamTotals.set(scored.driverKey, totals);
        teamFallbackSum += scored.stressScore;
        teamFallbackCount += 1;
      })
    );
    const teamStatsCalc = computeOverallStressFromDrivers(teamTotals);
    const idx =
      teamStatsCalc.answerCount > 0
        ? teamStatsCalc.avg
        : teamFallbackCount > 0
          ? teamFallbackSum / teamFallbackCount
          : 0;
    const part = inviteCount ? Math.round((teamResponses.length / inviteCount) * 100) : 0;
    teamStats[t.teamId] = { stressIndex: idx, participation: part };
  });

  return NextResponse.json({
    data: teams.map((team) => ({
      id: team.id,
      name: team.name,
      stressIndex: teamStats[team.id]?.stressIndex ?? 0,
      participation: teamStats[team.id]?.participation ?? 0,
    })),
  });
}
