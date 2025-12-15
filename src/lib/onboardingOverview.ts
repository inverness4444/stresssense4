import { prisma } from "@/lib/prisma";

export async function getOnboardingOverviewForUser(params: { orgId: string; userId: string }) {
  const activeJourneys = await prisma.onboardingJourney.findMany({
    where: { organizationId: params.orgId, userId: params.userId, status: "active" },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
  const completedJourneys = await prisma.onboardingJourney.findMany({
    where: { organizationId: params.orgId, userId: params.userId, status: "completed" },
    orderBy: { actualEndDate: "desc" },
  });
  const overallProgress = activeJourneys.length
    ? activeJourneys.reduce((acc, j) => acc + (j.progress ?? 0), 0) / activeJourneys.length
    : 0;
  const nextSteps = await prisma.onboardingStep.findMany({
    where: {
      journey: { organizationId: params.orgId, userId: params.userId, status: "active" },
      status: { in: ["pending", "in_progress"] },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });
  return {
    activeJourneys: activeJourneys.map((j) => ({ journey: j, steps: j.steps })),
    completedJourneys,
    overallProgress,
    nextSteps,
  };
}

export async function getOnboardingOverviewForManager(params: { orgId: string; managerId: string }) {
  const journeys = await prisma.onboardingJourney.findMany({
    where: { organizationId: params.orgId, managerId: params.managerId, status: "active" },
    include: { user: true, steps: true },
  });
  const teamJourneys = journeys.map((j) => {
    const completed = j.steps.filter((s) => s.status === "completed").length;
    const progress = j.steps.length ? completed / j.steps.length : 0;
    return { user: j.user, journey: j, progress };
  });
  const atRiskJourneys = teamJourneys.filter((j) => {
    const overdue = j.journey.steps.some(
      (s) => s.status !== "completed" && s.dueDate && s.dueDate < new Date()
    );
    return overdue || (j.progress < 0.3 && daysSince(journeyStart(j.journey)) > 20);
  }).map((j) => ({ user: j.user, journey: j.journey, reason: "Progress behind schedule" }));

  const stats = {
    totalJourneys: teamJourneys.length,
    avgProgress: teamJourneys.length
      ? teamJourneys.reduce((acc, j) => acc + j.progress, 0) / teamJourneys.length
      : 0,
    overdueStepsCount: journeys.reduce(
      (acc, j) =>
        acc +
        j.steps.filter((s) => s.status !== "completed" && s.dueDate && s.dueDate < new Date()).length,
      0
    ),
  };

  return { teamJourneys, atRiskJourneys, stats };
}

function daysSince(date: Date | null) {
  if (!date) return 0;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function journeyStart(journey: { startDate: Date }) {
  return journey.startDate;
}

export async function getOnboardingTemplatesForHr(params: { orgId: string }) {
  const templates = await prisma.onboardingJourneyTemplate.findMany({
    where: { organizationId: params.orgId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  const stepsByTemplate: Record<string, any[]> = {};
  for (const tpl of templates) {
    stepsByTemplate[tpl.id] = await prisma.onboardingStepTemplate.findMany({
      where: { templateId: tpl.id },
      orderBy: { orderIndex: "asc" },
    });
  }
  return { templates, stepsByTemplate };
}

export async function getOnboardingHistoryForUser(params: { orgId: string; userId: string }) {
  const journeys = await prisma.onboardingJourney.findMany({
    where: { organizationId: params.orgId, userId: params.userId },
    orderBy: { createdAt: "desc" },
  });
  return { journeys };
}
