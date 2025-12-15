import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { ensureOrgSettings } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`export:${user.id}:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limiter.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const settings = await ensureOrgSettings(user.organizationId);
  const survey = await prisma.survey.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      questions: true,
      targets: { include: { team: true } },
      responses: {
        include: {
          answers: true,
          inviteToken: { include: { user: { include: { teams: true } } } },
        },
      },
    },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const managerTeams = (
    await prisma.userTeam.findMany({ where: { userId: user.id }, select: { teamId: true } })
  ).map((t) => t.teamId);
  const overlap = survey.targets.some((t) => managerTeams.includes(t.teamId));
  if (user.role === "MANAGER" && (!overlap || !settings.allowManagerAccessToAllSurveys)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allowedTeamIds = user.role === "MANAGER" ? managerTeams : undefined;

  const teamResponseCounts: Record<string, number> = {};
  survey.responses.forEach((r) => {
    const team = r.inviteToken.user.teams.find((t) => survey.targets.some((st) => st.teamId === t.teamId));
    if (allowedTeamIds && team && !allowedTeamIds.includes(team.teamId)) return;
    if (team) {
      teamResponseCounts[team.teamId] = (teamResponseCounts[team.teamId] ?? 0) + 1;
    }
  });

  const lines: string[] = [];
  lines.push("surveyId,surveyName,teamName,questionOrder,questionText,questionType,scaleValue,textValue,submittedAt");

  survey.responses.forEach((response) => {
    const team = response.inviteToken.user.teams.find((t) => survey.targets.some((st) => st.teamId === t.teamId));
    if (allowedTeamIds && team && !allowedTeamIds.includes(team.teamId)) return;
    const teamId = team?.teamId;
    const teamNameSafe =
      teamId && (teamResponseCounts[teamId] ?? 0) >= (survey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown)
        ? survey.targets.find((t) => t.teamId === teamId)?.team.name ?? "Aggregated"
        : "Hidden";

    response.answers.forEach((answer) => {
      const question = survey.questions.find((q) => q.id === answer.questionId);
      if (!question) return;
      const row = [
        survey.id,
        `"${survey.name.replace(/"/g, '""')}"`,
        `"${teamNameSafe.replace(/"/g, '""')}"`,
        question.order,
        `"${question.text.replace(/"/g, '""')}"`,
        question.type,
        answer.scaleValue ?? "",
        answer.textValue ? `"${answer.textValue.replace(/"/g, '""')}"` : "",
        new Date(response.submittedAt).toISOString().split("T")[0],
      ].join(",");
      lines.push(row);
    });
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="survey-${survey.id}.csv"`,
    },
  });
}
