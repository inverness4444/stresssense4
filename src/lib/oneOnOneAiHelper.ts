import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/lib/ai";
import { sanitizeTextForAI } from "@/lib/aiPrivacy";

export async function generateOneOnOneAgendaSuggestions(params: { orgId: string; managerId: string; employeeId: string }) {
  const engagement = await prisma.surveyEngagementSnapshot.findFirst({
    where: { organizationId: params.orgId, team: { users: { some: { userId: params.employeeId } } } },
    orderBy: { periodEnd: "desc" },
  });
  const personal = await prisma.personalStatusSnapshot.findFirst({
    where: { organizationId: params.orgId, userId: params.employeeId },
    orderBy: { periodEnd: "desc" },
  });
  const comments = await prisma.surveyAnswer.findMany({
    where: { response: { inviteToken: { userId: params.employeeId } }, textValue: { not: null } },
    take: 5,
    select: { textValue: true },
  });
  const client = getAIClient();
  const prompt = `You are a helpful manager assistant. Suggest 3-5 talking points for a 1:1 between manager and employee.
Context: engagementScore=${engagement?.engagementScore ?? "n/a"}, stressScore=${personal?.stressLevelScore ?? "n/a"}, mood=${personal?.moodAverage ?? "n/a"}.
Recent comments: ${comments.map((c) => sanitizeTextForAI(c.textValue ?? "")).join(" | ")}.
Return JSON {talkingPoints:string[]}. Keep it short, supportive, non-medical.`;
  try {
    const resp = await client.summarize({ prompt });
    const parsed = JSON.parse(resp.text);
    return parsed.talkingPoints as string[];
  } catch {
    return ["Обсудить нагрузку и приоритеты", "Разобрать успехи недели", "Запланировать отдых/ресурсы"];
  }
}
