import { prisma } from "@/lib/prisma";

export async function sendOnboardingNudges() {
  const now = new Date();
  const steps = await prisma.onboardingStep.findMany({
    where: {
      status: { in: ["pending", "in_progress"] },
      dueDate: { not: null },
    },
    include: { journey: true },
  });
  for (const step of steps) {
    if (!step.dueDate) continue;
    const daysDiff = Math.floor((step.dueDate.getTime() - now.getTime()) / 86400000);
    if (daysDiff === 0 || daysDiff < 0) {
      // check existing nudge by sourceRef
      const existing = await prisma.actionCenterItem.findFirst({
        where: {
          organizationId: step.journey.organizationId,
          userId: step.journey.userId,
          sourceRef: step.id,
          type: "onboarding_step",
          status: { in: ["open", "in_progress"] },
        },
      });
      if (!existing) {
        await prisma.actionCenterItem.create({
          data: {
            organizationId: step.journey.organizationId,
            userId: step.journey.userId,
            type: "onboarding_step",
            title: step.title,
            description: step.description ?? undefined,
            severity: daysDiff < 0 ? "high" : "medium",
            status: "open",
            dueAt: step.dueDate,
            sourceRef: step.id,
          },
        });
      }
    }
  }
}
