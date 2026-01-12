import { NextResponse } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:metrics"]);
  if ("error" in auth) return auth.error;

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
      data: {
        lastSurveyId: null,
        lastSurveyName: null,
        averageStressIndex: 0,
        participation: 0,
        topTeamsByStress: [],
      },
    });
  }

  const invites = latestSurvey.inviteTokens.length;
  const responses = latestSurvey.responses.length;
  const participation = invites ? Math.round((responses / invites) * 100) : 0;
  const questionMap = new Map(latestSurvey.questions.map((q: any) => [q.id, q]));
  const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
  let fallbackSum = 0;
  let fallbackCount = 0;
  latestSurvey.responses.forEach((response: any) => {
    response.answers.forEach((answer: any) => {
      const question = questionMap.get(answer.questionId);
      if (!question) return;
      const scored = scoreAnswer(answer, question);
      if (!scored) return;
      const totals = driverTotals.get(scored.driverKey) ?? { sum: 0, count: 0 };
      totals.sum += scored.stressScore;
      totals.count += 1;
      driverTotals.set(scored.driverKey, totals);
      fallbackSum += scored.stressScore;
      fallbackCount += 1;
    });
  });
  const stressStats = computeOverallStressFromDrivers(driverTotals);
  const averageStressIndex =
    stressStats.answerCount > 0
      ? stressStats.avg
      : fallbackCount > 0
        ? fallbackSum / fallbackCount
        : 0;

  const minBreakdown = latestSurvey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown ?? 4;
  const teamStats = latestSurvey.targets.map((t: any) => {
    const teamResponses = latestSurvey.responses.filter((r: any) => r.inviteToken.user.teams.some((ut: any) => ut.teamId === t.teamId));
    const inviteCount = latestSurvey.inviteTokens.filter((i: any) => i.user.teams.some((ut: any) => ut.teamId === t.teamId)).length;
    if (teamResponses.length < minBreakdown) {
      return { teamName: t.team.name, hidden: true };
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
    const teamStats = computeOverallStressFromDrivers(teamTotals);
    const idx =
      teamStats.answerCount > 0
        ? teamStats.avg
        : teamFallbackCount > 0
          ? teamFallbackSum / teamFallbackCount
          : 0;
    const part = inviteCount ? Math.round((teamResponses.length / inviteCount) * 100) : 0;
    return {
      teamName: t.team.name,
      hidden: false,
      stressIndex: idx,
      participation: part,
    };
  });

  const topTeamsByStress = teamStats
    .filter((t: any) => !t.hidden)
    .sort((a: any, b: any) => (b.stressIndex ?? 0) - (a.stressIndex ?? 0))
    .slice(0, 5);

  return NextResponse.json({
    data: {
      lastSurveyId: latestSurvey.id,
      lastSurveyName: latestSurvey.name,
      averageStressIndex,
      participation,
      topTeamsByStress,
    },
  });
}
