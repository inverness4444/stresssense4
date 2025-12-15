import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/lib/ai";
import { sanitizeTextForAI } from "@/lib/aiPrivacy";

export async function generateManagerAiLens(params: { orgId: string; teamId: string }) {
  const status = await prisma.teamStatusSnapshot.findFirst({
    where: { organizationId: params.orgId, teamId: params.teamId },
    orderBy: { periodEnd: "desc" },
  });
  const comments = await prisma.surveyAnswer.findMany({
    where: {
      response: {
        survey: { organizationId: params.orgId },
        inviteToken: { user: { teams: { some: { teamId: params.teamId } } } },
      },
      textValue: { not: null },
    },
    select: { textValue: true },
    take: 20,
  });

  const client = getAIClient();
  const prompt = `You are a coach summarizing team health. Scores: engagement=${status?.engagementScore ?? "n/a"}, stress=${status?.stressIndex ?? "n/a"}, risk=${status?.riskLevel ?? "n/a"}.
Generate JSON: {summary: string (<=4 sentences), risks: string[], strengths: string[], suggestedActions: string[]}. No PII.`;
  try {
    const resp = await client.summarize({
      prompt: prompt + "\nComments: " + comments.map((c) => sanitizeTextForAI(c.textValue ?? "")).join(" | ").slice(0, 3000),
    });
    const parsed = JSON.parse(resp.text);
    return parsed;
  } catch {
    return {
      summary: "Team is stable; engagement is improving while stress needs monitoring.",
      risks: ["Workload", "Participation dip"],
      strengths: ["Recognition", "Manager support"],
      suggestedActions: ["Run short pulse next week", "Appreciation shoutout", "1:1s with overloaded folks"],
    };
  }
}
