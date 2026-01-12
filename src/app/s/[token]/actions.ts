'use server';

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { updateTeamMetricsFromSurvey } from "@/lib/orgData";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

type AnswerInput = {
  questionId: string;
  type: string;
  scaleValue?: number;
  textValue?: string;
};

export async function submitSurveyResponse(runId: string, answers: AnswerInput[]) {
  const run = await prisma.surveyRun.findUnique({
    where: { id: runId },
    include: { template: { include: { questions: true } }, team: true },
  });
  if (!run) return { error: "Survey link is invalid." };

  const user = await getCurrentUser();
  const canAttachMember =
    Boolean(user?.member?.id) && user?.organizationId === run.orgId;

  const answerMap: Record<string, AnswerInput> = {};
  answers.forEach((a) => (answerMap[a.questionId] = a));

  await prisma.surveyResponse.create({
    data: {
      runId,
      memberId: canAttachMember ? user!.member!.id : null,
      respondentEmail: canAttachMember ? user!.email ?? null : null,
      answers: answerMap as any,
    },
  });

  // Recalculate metrics for the run
  const responses = await prisma.surveyResponse.findMany({ where: { runId } });
  const questions = run.template.questions;
  const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
  let fallbackSum = 0;
  let fallbackCount = 0;
  let engagementSum = 0;
  let engagementCount = 0;
  const tags: string[] = [];
  const stressDimensions = new Set(["stress", "workload", "load", "balance", "processes", "long_term"]);
  const engagementDimensions = new Set([
    "engagement",
    "clarity",
    "manager_support",
    "meetings_focus",
    "safety",
    "control",
    "recognition",
    "psych_safety",
    "atmosphere",
  ]);

  responses.forEach((resp: any) => {
    const ans = resp.answers as Record<string, any>;
    questions.forEach((q: any) => {
      const v = ans[q.id];
      if (v == null) return;
      if (q.type === "Scale1_5" || q.type === "Scale0_10") {
        const scored = scoreAnswer(v, q);
        if (!scored) return;
        const dimension = String(q.dimension ?? "").toLowerCase();
        const totals = driverTotals.get(scored.driverKey) ?? { sum: 0, count: 0 };
        totals.sum += scored.stressScore;
        totals.count += 1;
        driverTotals.set(scored.driverKey, totals);
        fallbackSum += scored.stressScore;
        fallbackCount += 1;
        if (stressDimensions.has(dimension) && !tags.includes(dimension)) {
          tags.push(dimension);
        } else if (engagementDimensions.has(dimension)) {
          engagementSum += scored.engagementScore;
          engagementCount += 1;
        }
      }
    });
  });

  const stressStats = computeOverallStressFromDrivers(driverTotals);
  const stressIndex =
    stressStats.answerCount > 0
      ? stressStats.avg
      : fallbackCount > 0
        ? fallbackSum / fallbackCount
        : 0;
  const engagementScore = engagementCount ? engagementSum / engagementCount : 0;

  await prisma.surveyRun.update({
    where: { id: runId },
    data: {
      avgStressIndex: stressIndex,
      avgEngagementScore: engagementScore,
      tags,
      completedCount: responses.length,
    },
  });

  if (run.teamId) {
    const team = await prisma.team.findUnique({ where: { id: run.teamId } });
    const participation =
      team && team.memberCount ? Math.min(100, Math.round((responses.length / team.memberCount) * 100)) : responses.length;
    await updateTeamMetricsFromSurvey(run.teamId, { stressIndex, engagementScore, participation }, tags as any);
  }

  revalidatePath(`/app/overview`);
  return { success: true };
}
