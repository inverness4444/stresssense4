import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";
import { getAIClient } from "@/lib/ai";

type SafetyLabel = "safe" | "sensitive" | "crisis";

export async function classifyMessageSafety(content: string): Promise<{ label: SafetyLabel; tags: string[] }> {
  if (!content) return { label: "safe", tags: [] };
  const lower = content.toLowerCase();
  if (lower.includes("self-harm") || lower.includes("suicide")) return { label: "crisis", tags: ["self_harm"] };
  // fallback to AI classifier
  try {
    const resp = await getAIClient().summarize({
      prompt: `Classify the safety risk of this message for a stress coaching app. Return one of: safe, sensitive, crisis. Message: "${content}"`,
      maxTokens: 80,
    });
    const text = resp.text.toLowerCase();
    if (text.includes("crisis")) return { label: "crisis", tags: [] };
    if (text.includes("sensitive")) return { label: "sensitive", tags: [] };
  } catch (e) {
    console.warn("safety classification failed", e);
  }
  return { label: "safe", tags: [] };
}

export async function handleSafetyForMessage(params: {
  organizationId: string;
  userId: string;
  messageId: string;
  content: string;
}) {
  const classification = await classifyMessageSafety(params.content);
  if (classification.label === "crisis") {
    const settings = await prisma.orgSafetySettings.findUnique({ where: { organizationId: params.organizationId } });
    const incident = await prisma.safetyIncident.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        source: "coach_message",
        sourceId: params.messageId,
        riskLevel: "high",
        tags: classification.tags,
      },
    });
    if (settings?.notifyHRForHighRisk && settings.hrNotificationEmail) {
      await addJob("safetyNotifyHR", {
        organizationId: params.organizationId,
        incidentId: incident.id,
        email: settings.hrNotificationEmail,
      });
    }
    return { uiMode: "show_emergency" as const, incidentId: incident.id };
  }
  return { uiMode: "normal" as const };
}
