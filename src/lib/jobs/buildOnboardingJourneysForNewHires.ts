import { prisma } from "@/lib/prisma";

export async function buildOnboardingJourneysForNewHires() {
  const templates = await prisma.onboardingJourneyTemplate.findMany({
    where: { isActive: true },
    include: { steps: true },
  });
  if (!templates.length) return;
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    include: { organization: true, teams: true },
  });
  const now = new Date();
  for (const user of users) {
    // simplistic heuristic: pick first template that matches jobFamily
    const template = templates.find((t) => !t.jobFamily || t.jobFamily === user.department);
    if (!template) continue;
    const existing = await prisma.onboardingJourney.findFirst({
      where: { organizationId: user.organizationId, userId: user.id, templateId: template.id, status: "active" },
    });
    if (existing) continue;
    const journey = await prisma.onboardingJourney.create({
      data: {
        organizationId: user.organizationId,
        templateId: template.id,
        userId: user.id,
        managerId: user.managerId,
        teamId: user.teams[0]?.teamId ?? null,
        title: template.title,
        description: template.description,
        startDate: now,
        targetEndDate: template.estimatedDurationDays ? new Date(now.getTime() + template.estimatedDurationDays * 86400000) : null,
        status: "active",
      },
    });
    const stepsData = template.steps.map((s) => ({
      organizationId: user.organizationId,
      journeyId: journey.id,
      templateStepId: s.id,
      orderIndex: s.orderIndex,
      title: s.title,
      description: s.description,
      type: s.type,
      category: s.category,
      dueDate: s.relativeDayOffset ? new Date(now.getTime() + s.relativeDayOffset * 86400000) : null,
      status: "pending",
      linkedCourseId: s.academyCourseId ?? null,
    }));
    await prisma.onboardingStep.createMany({ data: stepsData });
  }
}
