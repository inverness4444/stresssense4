import { prisma } from "@/lib/prisma";

export async function generateJourneyTemplateFromRole(params: {
  orgId: string;
  jobFamily: string;
  levelHint?: string;
  audienceType: string;
}) {
  // Deterministic fallback template without external AI
  const steps = [
    { title: "Встреча с менеджером", type: "meeting", relativeDayOffset: 1 },
    { title: "Инструменты и доступы", type: "task", relativeDayOffset: 2 },
    { title: "Знакомство с культурой", type: "reading", relativeDayOffset: 3 },
    { title: "Чек-ин первой недели", type: "checkin", relativeDayOffset: 7 },
  ];
  return {
    title: `Journey for ${params.jobFamily} ${params.levelHint ?? ""}`.trim(),
    description: "Сгенерированный план онбординга.",
    estimatedDurationDays: 30,
    steps,
  };
}

export async function generateOnboardingSummaryForManager(params: { orgId: string; managerId: string }) {
  const journeys = await prisma.onboardingJourney.findMany({
    where: { organizationId: params.orgId, managerId: params.managerId, status: "active" },
    include: { user: true, steps: true },
  });
  const atRiskPeople = journeys
    .filter((j: any) => j.steps.some((s: any) => s.status !== "completed" && s.dueDate && s.dueDate < new Date()))
    .map((j: any) => j.user.name);
  const summary =
    journeys.length === 0
      ? "Нет активных онбордингов в команде."
      : `Активных онбордингов: ${journeys.length}. Просроченные шаги у ${atRiskPeople.length} сотрудников.`;
  const suggestedActions = atRiskPeople.length
    ? ["Назначьте 1:1 с новыми сотрудниками", "Убедитесь, что есть доступы и курс в Academy"]
    : ["Продолжайте отслеживать прогресс, всё выглядит стабильно"];
  return { summary, atRiskPeople, suggestedActions };
}
