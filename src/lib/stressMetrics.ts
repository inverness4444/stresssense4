import { prisma } from "./prisma";
import type { Survey, SurveyQuestion } from "@prisma/client";
import { computeOverallStressFromDrivers, scoreAnswer, type DriverKey } from "@/lib/stressScoring";

export function normalize(value: number, min: number, max: number) {
  if (max === min) return 0;
  const normalized = ((value - min) / (max - min)) * 10;
  return Math.max(0, Math.min(10, Number(normalized.toFixed(2))));
}

export function averageScale(answers: { scaleValue: number | null }[]) {
  const valid = answers.filter((a) => a.scaleValue != null);
  const sum = valid.reduce((acc, a) => acc + (a.scaleValue ?? 0), 0);
  return valid.length ? sum / valid.length : 0;
}

export function computeParticipation(responses: number, invites: number) {
  if (!invites) return 0;
  return Math.round((responses / invites) * 100);
}

export async function teamAccessibleResponses(teamIds: string[], surveyId: string) {
  if (!teamIds.length) return [];
  return prisma.surveyResponse.findMany({
    where: {
      surveyId,
      inviteToken: {
        user: {
          teams: {
            some: { teamId: { in: teamIds } },
          },
        },
      },
    },
    include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } },
  });
}

export function averageStressIndexForSurvey(
  survey: Survey & { responses: { answers: { scaleValue: number | null; questionId: string }[] }[] },
  questions: SurveyQuestion[],
  scaleMin: number,
  scaleMax: number
) {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const driverTotals = new Map<DriverKey, { sum: number; count: number }>();
  let fallbackSum = 0;
  let fallbackCount = 0;

  survey.responses.forEach((response) => {
    response.answers.forEach((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question || question.type !== "SCALE") return;
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
  if (stressStats.answerCount === 0 && fallbackCount > 0) {
    return Number((fallbackSum / fallbackCount).toFixed(2));
  }
  return Number(stressStats.avg.toFixed(2));
}
