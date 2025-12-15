import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";

export async function notifyCompDeadlines() {
  const upcoming = await prisma.compensationReviewCycle.findMany({
    where: {
      lockDate: { not: null },
    },
  });
  const now = new Date();
  for (const cycle of upcoming) {
    if (!cycle.lockDate) continue;
    const daysLeft = Math.floor((cycle.lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft === 3 || daysLeft === 7) {
      const managers = await prisma.compensationReviewParticipant.findMany({
        where: { cycleId: cycle.id },
        select: { managerId: true },
        distinct: ["managerId"],
      });
      for (const m of managers) {
        if (!m.managerId) continue;
        await prisma.actionCenterItem.create({
          data: {
            organizationId: cycle.organizationId,
            managerUserId: m.managerId,
            type: "comp_review_todo",
            title: `Finish compensation recommendations for ${cycle.key}`,
            severity: "high",
            status: "open",
          },
        });
      }
    }
  }
}
