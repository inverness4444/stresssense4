import { prisma } from "./prisma";
import { normalizeScale } from "./surveys";

export async function triggerPlaybooksForSurvey(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      organization: { include: { settings: true } },
      questions: true,
      responses: { include: { answers: true, inviteToken: { include: { user: { include: { teams: true } } } } } },
      targets: { include: { team: true } },
    },
  });
  if (!survey) return;
  const playbooks = await prisma.playbook.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: survey.organizationId }],
      isActive: true,
    },
    include: { steps: true },
  });

  for (const pb of playbooks) {
    if (pb.triggerType === "HIGH_STRESS") {
      const threshold = (pb.triggerConfig as any)?.threshold ?? 70;
      const scaleMin = survey.organization.settings?.stressScaleMin ?? 1;
      const scaleMax = survey.organization.settings?.stressScaleMax ?? 5;
      for (const target of survey.targets) {
        const teamResponses = survey.responses.filter((r: any) => r.inviteToken.user.teams.some((ut: any) => ut.teamId === target.teamId));
        let sum = 0;
        let count = 0;
        survey.questions
          .filter((q: any) => q.type === "SCALE")
          .forEach((q: any) => {
            teamResponses.forEach((r: any) => {
              const ans = r.answers.find((a: any) => a.questionId === q.id);
              if (ans?.scaleValue != null) {
                sum += ans.scaleValue;
                count += 1;
              }
            });
          });
        if (!count) continue;
        const idx = normalizeScale(sum / count, scaleMin, scaleMax);
        if (idx >= threshold) {
          await createActionItemsFromPlaybook(pb.id, survey.id, target.teamId, survey.createdById);
        }
      }
    }
  }
}

async function createActionItemsFromPlaybook(playbookId: string, surveyId: string, teamId: string | null, createdById: string) {
  const pb = await prisma.playbook.findUnique({ where: { id: playbookId }, include: { steps: true } });
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!pb || !survey) return;
  await Promise.all(
    pb.steps.map((step: any) =>
      prisma.actionItem.create({
        data: {
          organizationId: survey.organizationId,
          surveyId,
          teamId,
          assigneeId: teamId ? null : survey.createdById,
          title: step.title,
          description: step.description,
          createdById,
        },
      })
    )
  );
}
