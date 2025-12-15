import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";
import { getSurveyWithMetrics } from "@/lib/surveys";
import { ensureOrgSettings } from "@/lib/access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(_req, ["read:surveys"]);
  if ("error" in auth) return auth.error;

  const surveyId = id;
  const settings = await ensureOrgSettings(auth.key!.organizationId);
  const survey = await getSurveyWithMetrics(surveyId, auth.key!.organizationId, {
    scaleMin: settings.stressScaleMin,
    scaleMax: settings.stressScaleMax,
  });
  if (!survey) return errorResponse("NOT_FOUND", "Survey not found", 404);

  const minBreakdown = survey.survey.minResponsesForBreakdown ?? settings.minResponsesForBreakdown ?? 4;

  const questionBreakdown = survey.questionBreakdown.map((qb: any) => {
    if (qb.question.type === "SCALE") {
      return {
        questionId: qb.question.id,
        text: qb.question.text,
        type: qb.question.type,
        counts: qb.counts,
        average: qb.average,
        stressIndex: qb.stressIndex,
      };
    }
    return {
      questionId: qb.question.id,
      text: qb.question.text,
      type: qb.question.type,
      commentsCount: qb.comments?.length ?? 0,
    };
  });

  const teamBreakdown = survey.teamBreakdown.map((team: any) => {
    const hidden = team.responses < minBreakdown;
    return {
      teamId: team.team.id,
      teamName: team.team.name,
      hidden,
      participation: team.participation,
      responses: hidden ? undefined : team.responses,
      stressIndex: hidden ? undefined : team.stressIndex,
      status: hidden ? "Hidden" : team.status,
    };
  });

  return NextResponse.json({
    data: {
      id: survey.survey.id,
      name: survey.survey.name,
      status: survey.survey.status,
      startsAt: survey.survey.startsAt,
      endsAt: survey.survey.endsAt,
      minResponsesForBreakdown: survey.survey.minResponsesForBreakdown,
      participation: survey.stats.participation,
      averageStressIndex: survey.stats.averageStressIndex,
      targets: survey.survey.targets.map((t: any) => ({ teamId: t.teamId })),
      questionBreakdown,
      teamBreakdown,
    },
  });
}
