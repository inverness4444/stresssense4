import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/lib/ai";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`ai-draft:${user.id}:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limiter.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = (await req.json()) as { teamId: string };
  const team = await prisma.team.findFirst({
    where: { id: body.teamId, organizationId: user.organizationId },
  });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const recent = await prisma.survey.findMany({
    where: { organizationId: user.organizationId, targets: { some: { teamId: team.id } } },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      questions: true,
      insight: true,
    },
  });

  const survey = recent[0];
  const inviteCount = survey?.responses.length ?? 0;
  let avg = 0;
  let count = 0;
  survey?.questions
    .filter((q: any) => q.type === "SCALE")
    .forEach((q: any) => {
      survey.responses.forEach((r: any) => {
        const ans = r.answers.find((a: any) => a.questionId === q.id);
        if (ans?.scaleValue != null) {
          avg += ans.scaleValue;
          count += 1;
        }
      });
    });
  const mean = count ? avg / count : 0;

  const ai = getAIClient();
  try {
    const res = await ai.summarize({
      prompt: `Draft a supportive, concise message from a manager to the "${team.name}" team acknowledging recent stress levels.\nLatest survey average scale value: ${mean.toFixed(
        2
      )} with ${inviteCount} responses.\nAI summary: ${survey?.insight?.summaryText ?? "n/a"}\nGuidelines: be empathetic, action-oriented, invite feedback, avoid blame.`,
      maxTokens: 300,
    });
    return NextResponse.json({ text: res.text });
  } catch (e: any) {
    console.error("AI draft failed", e);
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
