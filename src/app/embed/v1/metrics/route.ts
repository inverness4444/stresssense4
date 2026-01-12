import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/publicApi";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

async function validate(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const publicKey = searchParams.get("publicKey");
  if (!workspaceId || !publicKey) return { error: errorResponse("UNAUTHORIZED", "Missing embed credentials", 401) };
  const config = await prisma.embedConfig.findUnique({ where: { organizationId: workspaceId } });
  if (!config || config.publicKey !== publicKey) return { error: errorResponse("UNAUTHORIZED", "Invalid embed key", 401) };
  const origin = req.headers.get("origin");
  if (config.allowedOrigins.length && origin && !config.allowedOrigins.includes(origin)) {
    return { error: errorResponse("FORBIDDEN", "Origin not allowed", 403) };
  }
  return { config };
}

export async function GET(req: Request) {
  const validated = await validate(req);
  if ("error" in validated) return validated.error;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId")!;

  const survey = await prisma.survey.findFirst({
    where: { organizationId: workspaceId },
    include: { responses: { include: { answers: true, inviteToken: true } }, inviteTokens: true, questions: true },
    orderBy: { createdAt: "desc" },
  });
  if (!survey) return NextResponse.json({ data: null });

  const invites = survey.inviteTokens.length;
  const responses = survey.responses.length;
  const participation = invites ? Math.round((responses / invites) * 100) : 0;
  const questionMap = new Map(survey.questions.map((q: any) => [q.id, q]));
  const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
  let fallbackSum = 0;
  let fallbackCount = 0;
  survey.responses.forEach((response: any) => {
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
  const stressIndex =
    stressStats.answerCount > 0
      ? stressStats.avg
      : fallbackCount > 0
        ? fallbackSum / fallbackCount
        : 0;

  return NextResponse.json({
    data: {
      surveyId: survey.id,
      surveyName: survey.name,
      averageStressIndex: stressIndex,
      participation,
    },
  });
}
