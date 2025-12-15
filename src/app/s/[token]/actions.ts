'use server';

import { prisma } from "@/lib/prisma";
import { triggerWebhookEvent } from "@/lib/webhooks";
import { trackProductEvent } from "@/lib/analytics";
import { revalidatePath } from "next/cache";

type AnswerInput = {
  questionId: string;
  type: string;
  scaleValue?: number;
  textValue?: string;
};

export async function submitSurveyResponse(token: string, answers: AnswerInput[]) {
  const invite = await prisma.surveyInviteToken.findUnique({
    where: { token },
    include: {
      survey: {
        include: {
          questions: true,
        },
      },
    },
  });

  if (!invite) return { error: "Survey link is invalid." };
  if (invite.usedAt) return { error: "This survey was already completed." };
  if (invite.survey.status !== "ACTIVE") return { error: "Survey is not active." };

  const now = new Date();
  if (invite.survey.startsAt && now < invite.survey.startsAt) return { error: "Survey hasn't started yet." };
  if (invite.survey.endsAt && now > invite.survey.endsAt) return { error: "Survey is closed." };

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: invite.surveyId,
      inviteTokenId: invite.id,
      answers: {
        create: answers.map((a) => ({
          questionId: a.questionId,
          scaleValue: a.type === "SCALE" ? a.scaleValue ?? null : null,
          textValue: a.type === "TEXT" ? a.textValue ?? null : null,
        })),
      },
    },
  });

  await prisma.surveyInviteToken.update({
    where: { id: invite.id },
    data: { usedAt: now },
  });

  await triggerWebhookEvent(invite.survey.organizationId, "survey.response.created", {
    surveyId: invite.surveyId,
    responseId: response.id,
    submittedAt: now.toISOString(),
  });
  await trackProductEvent({
    eventName: "survey_response_submitted",
    source: "web_app",
    properties: { surveyId: invite.surveyId, variantKey: invite.variantKey },
  });

  revalidatePath(`/app/surveys/${invite.surveyId}`);
  return { success: true, responseId: response.id };
}
