import { NextResponse, type NextRequest } from "next/server";
import { getMobileUser } from "@/lib/authMobile";
import { prisma } from "@/lib/prisma";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const teamIds =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN"
      ? (
          await prisma.team.findMany({
            where: { organizationId: user.organizationId },
            select: { id: true },
          })
        ).map((t: any) => t.id)
      : user.teams.map((t: any) => t.teamId);

  const latestSurveys = await prisma.survey.findMany({
    where: { organizationId: user.organizationId, targets: { some: { teamId: { in: teamIds } } } },
    include: {
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      inviteTokens: { include: { user: { include: { teams: true } } } },
      targets: { include: { team: true } },
      questions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const perTeam: Record<
    string,
    { name: string; participation: number; stressIndex: number; lastSurveyId: string; lastSurveyName: string }
  > = {};

  latestSurveys.forEach((survey: any) => {
    const questionMap = new Map(survey.questions.map((q: any) => [q.id, q]));
    survey.targets
      .filter((t: any) => teamIds.includes(t.teamId))
      .forEach((t: any) => {
        const responses = survey.responses.filter((r: any) => r.inviteToken.user.teams.some((ut: any) => ut.teamId === t.teamId));
        const invites = survey.inviteTokens.filter((i: any) => i.user.teams.some((ut: any) => ut.teamId === t.teamId)).length;
        const part = invites ? Math.round((responses.length / invites) * 100) : 0;
        const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
        let fallbackSum = 0;
        let fallbackCount = 0;
        responses.forEach((r: any) => {
          r.answers.forEach((ans: any) => {
            const question = questionMap.get(ans.questionId);
            if (!question) return;
            const scored = scoreAnswer(ans, question);
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
        const idx =
          stressStats.answerCount > 0
            ? stressStats.avg
            : fallbackCount > 0
              ? fallbackSum / fallbackCount
              : 0;
        perTeam[t.teamId] = {
          name: t.team.name,
          participation: part,
          stressIndex: idx,
          lastSurveyId: survey.id,
          lastSurveyName: survey.name,
        };
      });
  });

  return NextResponse.json({ data: Object.entries(perTeam).map(([id, v]) => ({ teamId: id, ...v })) });
}
