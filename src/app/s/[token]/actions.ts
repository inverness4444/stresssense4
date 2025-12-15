'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { updateTeamMetricsFromSurvey } from "@/lib/orgData";

type AnswerInput = {
  questionId: string;
  type: string;
  scaleValue?: number;
  textValue?: string;
};

function normalizeValue(type: string, value: number) {
  if (type === "Scale1_5") {
    return Math.max(0, Math.min(10, ((value - 1) / 4) * 10));
  }
  return Math.max(0, Math.min(10, value));
}

export async function submitSurveyResponse(runId: string, answers: AnswerInput[]) {
  const run = await prisma.surveyRun.findUnique({
    where: { id: runId },
    include: { template: { include: { questions: true } }, team: true },
  });
  if (!run) return { error: "Survey link is invalid." };

  const answerMap: Record<string, AnswerInput> = {};
  answers.forEach((a) => (answerMap[a.questionId] = a));

  await prisma.surveyResponse.create({
    data: {
      runId,
      answers: answerMap as any,
    },
  });

  // Recalculate metrics for the run
  const responses = await prisma.surveyResponse.findMany({ where: { runId } });
  const questions = run.template.questions;
  let stressSum = 0;
  let stressCount = 0;
  let engagementSum = 0;
  let engagementCount = 0;
  const tags: string[] = [];

  responses.forEach((resp: any) => {
    const ans = resp.answers as Record<string, any>;
    questions.forEach((q: any) => {
      const v = ans[q.id];
      if (v == null) return;
      if (q.type === "Scale1_5" || q.type === "Scale0_10") {
        const val = normalizeValue(q.type, Number(v));
        if (q.dimension === "stress" || q.dimension === "workload") {
          stressSum += val;
          stressCount += 1;
          if (!tags.includes(q.dimension)) tags.push(q.dimension);
        } else if (q.dimension === "engagement") {
          engagementSum += val;
          engagementCount += 1;
        }
      }
    });
  });

  const stressIndex = stressCount ? stressSum / stressCount : 0;
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
