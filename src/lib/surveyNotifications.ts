import { prisma } from "@/lib/prisma";
import { createNotificationsForAdmins } from "@/lib/notifications";

export async function notifySurveyReportReady(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, name: true, organizationId: true, minResponsesForBreakdown: true },
  });
  if (!survey) return;

  const responsesCount = await prisma.surveyResponse.count({ where: { surveyId } });
  const minResponses = survey.minResponsesForBreakdown ?? 4;
  if (responsesCount < minResponses) return;

  await createNotificationsForAdmins({
    organizationId: survey.organizationId,
    type: "SURVEY_REPORT_READY",
    title: "Survey report is ready",
    body: `Results for "${survey.name}" are now available.`,
    link: `/app/surveys/${survey.id}`,
    dedupe: true,
  });
}
