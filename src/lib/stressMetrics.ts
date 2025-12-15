import { prisma } from "./prisma";
import type { Survey, SurveyQuestion } from "@prisma/client";

export function normalize(value: number, min: number, max: number) {
  if (max === min) return 0;
  return Math.max(0, Math.min(100, Math.round(((value - min) / (max - min)) * 100)));
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
  let sum = 0;
  let count = 0;
  const scaleQuestions = questions.filter((q) => q.type === "SCALE");
  survey.responses.forEach((r) => {
    scaleQuestions.forEach((q) => {
      const ans = r.answers.find((a) => a.questionId === q.id);
      if (ans?.scaleValue != null) {
        sum += ans.scaleValue;
        count += 1;
      }
    });
  });
  if (!count) return 0;
  return normalize(sum / count, scaleMin, scaleMax);
}
