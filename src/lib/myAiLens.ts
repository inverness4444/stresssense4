import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/lib/ai";
import { sanitizeTextForAI } from "@/lib/aiPrivacy";

export async function generatePersonalAiLens(params: { orgId: string; userId: string }) {
  const snapshot = await prisma.personalStatusSnapshot.findFirst({
    where: { organizationId: params.orgId, userId: params.userId },
    orderBy: { periodEnd: "desc" },
  });

  const checkins = await prisma.habitCheckin.findMany({
    where: { userId: params.userId },
    orderBy: { date: "desc" },
    take: 10,
  });

  const tasks = await prisma.habitTask.findMany({
    where: { plan: { userId: params.userId, organizationId: params.orgId, status: "active" } },
    take: 10,
  });

  const comments = await prisma.surveyAnswer.findMany({
    where: {
      response: { inviteToken: { userId: params.userId } },
      textValue: { not: null },
    },
    select: { textValue: true },
    take: 10,
  });

  const client = getAIClient();
  const prompt = `You are a supportive stress and habits coach. Do not give medical advice. Input:
engagementScore=${snapshot?.engagementScore ?? "n/a"}, stressLevelScore=${snapshot?.stressLevelScore ?? "n/a"}, moodAverage=${snapshot?.moodAverage ?? "n/a"},
habitCompletionRate=${snapshot?.habitCompletionRate ?? "n/a"}, coachConversations=${snapshot?.coachConversations ?? "n/a"}, academyProgressScore=${snapshot?.academyProgressScore ?? "n/a"}, trend=${snapshot?.trendLabel ?? "n/a"}.
Recent habits: ${tasks.map((t: any) => t.title).join(", ") || "none"}.
Recent habit checkins: ${checkins.length}. Comments: ${comments.map((c: any) => sanitizeTextForAI(c.textValue ?? "")).join(" | ")}.
Return JSON {summary:string<=4 sentences, risks:string[], strengths:string[], suggestedHabits:string[], suggestedCourses:string[]} with no PII.`;

  try {
    const resp = await client.summarize({ prompt });
    const parsed = JSON.parse(resp.text);
    return parsed;
  } catch {
    return {
      summary: "Your stress looks stable. Keep your habits routine and add small recovery breaks.",
      risks: ["Possible workload spikes"],
      strengths: ["Consistent check-ins"],
      suggestedHabits: ["Take 5-minute breaks every 90 minutes", "Evening unwind routine"],
      suggestedCourses: ["Stress basics", "Healthy routines"],
    };
  }
}
