import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAIClient } from "@/lib/ai";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`ai-chat:${user.id}:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limiter.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };
  const messages = body?.messages ?? [];
  const ai = getAIClient();

  const teamIds =
    user.role === "MANAGER"
      ? (
          await prisma.userTeam.findMany({
            where: { userId: user.id },
            select: { teamId: true },
          })
        ).map((t: any) => t.teamId)
      : [];

  const surveys = await prisma.survey.findMany({
    where: {
      organizationId: user.organizationId,
      ...(user.role === "MANAGER" ? { targets: { some: { teamId: { in: teamIds } } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      questions: true,
      insight: true,
      inviteTokens: true,
    },
  });

  const surveyContext = surveys
    .map((s: any) => {
      const inviteCount = s.responses.length ? s.responses.length : s.inviteTokens?.length ?? 0;
      const avg =
        s.responses.reduce((acc: number, r: any) => {
          const vals = r.answers.filter((a: any) => a.scaleValue != null).map((a: any) => a.scaleValue ?? 0);
          if (!vals.length) return acc;
          return acc + vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
        }, 0) / (s.responses.length || 1);
      return `Survey "${s.name}" status ${s.status}, responses ${s.responses.length}/${inviteCount}, approx avg scale ${avg.toFixed(
        2
      )}${s.insight ? `, AI summary: ${s.insight.summaryText}` : ""}`;
    })
    .join("\n");

  const contextMessage = `
You are StressSense AI, an HR assistant focused on stress survey insights. Do not reveal individual identities. Use only aggregate context.

Context about this organization:
${surveyContext || "No recent surveys."}
`;

  try {
    const aiRes = await ai.chat({
      messages: [
        { role: "system", content: "Be concise, actionable, and HR-friendly. Avoid medical advice." },
        { role: "assistant", content: contextMessage },
        ...messages,
      ],
    });
    return NextResponse.json({ text: aiRes.text });
  } catch (e: any) {
    console.error("AI chat failed", e);
    return NextResponse.json({ error: "AI unavailable", disabled: true }, { status: 503 });
  }
}
