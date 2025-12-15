import { prisma } from "@/lib/prisma";

export async function prepareCompensationCycleData(payload: { cycleId?: string } = {}) {
  const cycleId = payload.cycleId;
  if (!cycleId) return;
  const cycle = await prisma.compensationReviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) return;

  // Simple prep: ensure participants have current band/base snapshot
  const participants = await prisma.compensationReviewParticipant.findMany({
    where: { cycleId },
    include: { user: true },
  });
  for (const p of participants) {
    if (!p.currentBandId) {
      // try to infer from last assignment
      const lastAssignment = await prisma.compensationBandAssignment.findFirst({
        where: { organizationId: cycle.organizationId, userId: p.userId },
        include: { band: true },
        orderBy: { effectiveFrom: "desc" },
      });
      if (lastAssignment) {
        await prisma.compensationReviewParticipant.update({
          where: { id: p.id },
          data: {
            currentBandId: lastAssignment.bandId,
            currentBase: lastAssignment.baseSalary ?? lastAssignment.band.minBase,
            currentBonusPct: lastAssignment.bonusPct,
          },
        });
      }
    }
  }
}
