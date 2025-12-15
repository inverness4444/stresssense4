import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/lib/ai";
import { handleSafetyForMessage } from "./coachSafety";
import { recordUsage } from "./usageTracker";

export async function startOrGetSession(userId: string, organizationId: string, mode: "employee" | "manager" | "exec") {
  const session = await prisma.coachSession.findFirst({
    where: { userId, organizationId, closedAt: null, mode },
    orderBy: { updatedAt: "desc" },
  });
  if (session) return session;
  return prisma.coachSession.create({ data: { userId, organizationId, mode } });
}

export async function getSessionHistory(sessionId: string, limit = 15) {
  return prisma.coachMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function generateCoachReply(params: {
  sessionId: string;
  userId: string;
  organizationId: string;
  userMessage: string;
}) {
  await recordUsage(params.organizationId, "ai_coach_requests", 1);
  const session = await prisma.coachSession.findUnique({
    where: { id: params.sessionId },
    include: {
      user: true,
      summary: true,
    },
  });
  if (!session) throw new Error("Session not found");

  const messages = await prisma.coachMessage.findMany({
    where: { sessionId: params.sessionId },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  const preferences = await prisma.userWellbeingPreferences.findUnique({ where: { userId: params.userId } });
  const systemPrompt = [
    "You are a stress coach. You are NOT a doctor, do not give medical advice, do not discuss medication.",
    "Focus on workplace stress, boundaries, workload, recovery. If crisis indicators appear, direct to emergency resources and stop deepening the conversation.",
    preferences?.topicsToAvoid?.length ? `Avoid these topics: ${preferences.topicsToAvoid.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const history = messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));
  history.push({ role: "user", content: params.userMessage });

  const ai = getAIClient();
  const response = await ai.chat({
    messages: [{ role: "system", content: systemPrompt }, ...history],
    maxTokens: 512,
  });
  const assistantMessage = response.text;

  const savedUserMsg = await prisma.coachMessage.create({
    data: {
      sessionId: params.sessionId,
      role: "user",
      content: params.userMessage,
      safetyLabel: "safe",
    },
  });
  const safetyResult = await handleSafetyForMessage({
    organizationId: params.organizationId,
    userId: params.userId,
    messageId: savedUserMsg.id,
    content: params.userMessage,
  });

  await prisma.coachMessage.create({
    data: {
      sessionId: params.sessionId,
      role: "assistant",
      content: assistantMessage,
      safetyLabel: safetyResult.uiMode === "show_emergency" ? "sensitive" : "safe",
      metadata: { usedModel: (ai as any)?.model ?? "default" },
    },
  });

  return { assistantMessage, uiMode: safetyResult.uiMode };
}
