import { NextResponse } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";
import { ensureOrgSettings } from "@/lib/access";
import { normalize } from "@/lib/stressMetrics";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:metrics"]);
  if ("error" in auth) return auth.error;

  const settings = await ensureOrgSettings(auth.key!.organizationId);
  const latestSurvey = await prisma.survey.findFirst({
    where: { organizationId: auth.key!.organizationId },
    include: {
      inviteTokens: { include: { user: { include: { teams: true } } } },
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      targets: { include: { team: true } },
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestSurvey) {
    return NextResponse.json({
      data: {
        lastSurveyId: null,
        lastSurveyName: null,
        averageStressIndex: 0,
        participation: 0,
        topTeamsByStress: [],
      },
    });
  }

  const invites = latestSurvey.inviteTokens.length;
  const responses = latestSurvey.responses.length;
  const participation = invites ? Math.round((responses / invites) * 100) : 0;
  let sum = 0;
  let count = 0;
  latestSurvey.responses.forEach((r) => {
    r.answers.forEach((a) => {
      if (a.scaleValue != null) {
        sum += a.scaleValue;
        count += 1;
      }
    });
  });
  const avg = count ? sum / count : 0;
  const averageStressIndex = normalize(avg, settings.stressScaleMin, settings.stressScaleMax);

  const minBreakdown = latestSurvey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown ?? 4;
  const teamStats = latestSurvey.targets.map((t) => {
    const teamResponses = latestSurvey.responses.filter((r) => r.inviteToken.user.teams.some((ut) => ut.teamId === t.teamId));
    const inviteCount = latestSurvey.inviteTokens.filter((i) => i.user.teams.some((ut) => ut.teamId === t.teamId)).length;
    if (teamResponses.length < minBreakdown) {
      return { teamName: t.team.name, hidden: true };
    }
    let sumTeam = 0;
    let countTeam = 0;
    teamResponses.forEach((r) =>
      r.answers.forEach((a) => {
        if (a.scaleValue != null) {
          sumTeam += a.scaleValue;
          countTeam += 1;
        }
      })
    );
    const idx = countTeam ? normalize(sumTeam / countTeam, settings.stressScaleMin, settings.stressScaleMax) : 0;
    const part = inviteCount ? Math.round((teamResponses.length / inviteCount) * 100) : 0;
    return {
      teamName: t.team.name,
      hidden: false,
      stressIndex: idx,
      participation: part,
    };
  });

  const topTeamsByStress = teamStats
    .filter((t) => !t.hidden)
    .sort((a, b) => (b.stressIndex ?? 0) - (a.stressIndex ?? 0))
    .slice(0, 5);

  return NextResponse.json({
    data: {
      lastSurveyId: latestSurvey.id,
      lastSurveyName: latestSurvey.name,
      averageStressIndex,
      participation,
      topTeamsByStress,
    },
  });
}
