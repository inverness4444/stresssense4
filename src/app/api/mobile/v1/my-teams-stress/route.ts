import { NextResponse, type NextRequest } from "next/server";
import { getMobileUser } from "@/lib/authMobile";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";
import { normalize } from "@/lib/stressMetrics";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await ensureOrgSettings(user.organizationId);
  const teamIds =
    user.role === "ADMIN"
      ? (
          await prisma.team.findMany({
            where: { organizationId: user.organizationId },
            select: { id: true },
          })
        ).map((t) => t.id)
      : user.teams.map((t) => t.teamId);

  const latestSurveys = await prisma.survey.findMany({
    where: { organizationId: user.organizationId, targets: { some: { teamId: { in: teamIds } } } },
    include: {
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      inviteTokens: { include: { user: { include: { teams: true } } } },
      targets: { include: { team: true } },
      questions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const perTeam: Record<
    string,
    { name: string; participation: number; stressIndex: number; lastSurveyId: string; lastSurveyName: string }
  > = {};

  latestSurveys.forEach((survey) => {
    survey.targets
      .filter((t) => teamIds.includes(t.teamId))
      .forEach((t) => {
        const responses = survey.responses.filter((r) => r.inviteToken.user.teams.some((ut) => ut.teamId === t.teamId));
        const invites = survey.inviteTokens.filter((i) => i.user.teams.some((ut) => ut.teamId === t.teamId)).length;
        const part = invites ? Math.round((responses.length / invites) * 100) : 0;
        let sum = 0;
        let count = 0;
        survey.questions
          .filter((q) => q.type === "SCALE")
          .forEach((q) => {
            responses.forEach((r) => {
              const ans = r.answers.find((a) => a.questionId === q.id);
              if (ans?.scaleValue != null) {
                sum += ans.scaleValue;
                count += 1;
              }
            });
          });
        const idx = count ? normalize(sum / count, settings.stressScaleMin, settings.stressScaleMax) : 0;
        perTeam[t.teamId] = {
          name: t.team.name,
          participation: part,
          stressIndex: idx,
          lastSurveyId: survey.id,
          lastSurveyName: survey.name,
        };
      });
  });

  return NextResponse.json({ data: Object.entries(perTeam).map(([id, v]) => ({ teamId: id, ...v })) });
}
