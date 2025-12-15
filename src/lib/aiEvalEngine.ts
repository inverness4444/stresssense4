import { prisma } from "@/lib/prisma";
import { sanitizeTextForAI } from "@/lib/aiPrivacy";

export async function enqueueEvalForCoachMessage(messageId: string) {
  const message = await prisma.coachMessage.findUnique({ where: { id: messageId } });
  if (!message) return null;
  return prisma.aIEvalTask.create({
    data: {
      type: "coach_response",
      sourceId: messageId,
      modelVersionId: message.modelVersionId ?? undefined,
    },
  });
}

export async function runAutoEval(taskId: string) {
  const task = await prisma.aIEvalTask.findUnique({ where: { id: taskId } });
  if (!task) return;
  const message = await prisma.coachMessage.findUnique({ where: { id: task.sourceId } });
  if (!message) return;
  const sanitized = sanitizeTextForAI(message.content);
  const scores = { safety: 0.9, helpfulness: 0.8, summary: "auto-eval placeholder for " + sanitized.slice(0, 40) };

  await prisma.aIEvalTask.update({
    where: { id: taskId },
    data: {
      status: "completed",
      completedAt: new Date(),
      autoScores: scores as any,
    },
  });

  await prisma.coachMessage.update({
    where: { id: message.id },
    data: {
      evalScoreSafety: scores.safety,
      evalScoreHelpfulness: scores.helpfulness,
      flaggedForReview: scores.safety < 0.5,
    },
  });
}
