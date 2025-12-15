import { prisma } from "@/lib/prisma";

export async function getCompensationBands(params: { orgId: string }) {
  const bands = await prisma.compensationBand.findMany({
    where: { organizationId: params.orgId, isActive: true },
    orderBy: [{ jobFamily: "asc" }, { level: "asc" }, { key: "asc" }],
  });
  const jobFamilies = Array.from(new Set(bands.map((b: any) => b.jobFamily).filter(Boolean))) as string[];
  return { bands, jobFamilies };
}

export async function getCompensationCycleOverviewForHr(params: { orgId: string; cycleId: string }) {
  const cycle = await prisma.compensationReviewCycle.findFirstOrThrow({
    where: { organizationId: params.orgId, id: params.cycleId },
  });
  const participants = await prisma.compensationReviewParticipant.findMany({
    where: { cycleId: params.cycleId },
    include: {
      user: true,
      manager: true,
      currentBand: true,
      recommendations: { include: { proposedBand: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  let totalProposedBudget = 0;
  let avgIncreasePct = 0;
  let outOfRangeCount = 0;
  let counted = 0;
  participants.forEach((p: any) => {
    const rec = p.recommendations[0];
    if (p.currentBase && rec?.proposedBase) {
      const delta = rec.proposedBase - p.currentBase;
      totalProposedBudget += rec.proposedBase;
      avgIncreasePct += delta / p.currentBase;
      counted += 1;
    }
    if (rec?.outOfRangeFlag) outOfRangeCount += 1;
  });
  const aggregates = {
    totalParticipants: participants.length,
    totalProposedBudget,
    avgIncreasePct: counted ? avgIncreasePct / counted : 0,
    outOfRangeCount,
  };
  return {
    cycle,
    participants: participants.map((p: any) => ({ participant: p, recommendation: p.recommendations[0] })),
    aggregates,
  };
}

export async function getCompensationOverviewForManager(params: { orgId: string; cycleId: string; managerId: string }) {
  const cycle = await prisma.compensationReviewCycle.findFirstOrThrow({
    where: { organizationId: params.orgId, id: params.cycleId },
  });
  const myParticipants = await prisma.compensationReviewParticipant.findMany({
    where: { cycleId: params.cycleId, managerId: params.managerId },
    include: {
      user: true,
      currentBand: true,
      recommendations: { include: { proposedBand: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  const mapped = myParticipants.map((p: any) => {
    const rec = p.recommendations[0];
    let pctOfBand: number | null = null;
    let label: string | null = null;
    if (p.currentBand && p.currentBase) {
      const { minBase, maxBase } = p.currentBand;
      pctOfBand = Math.min(1, Math.max(0, (p.currentBase - minBase) / (maxBase - minBase)));
      label = pctOfBand < 0.33 ? "Below midpoint" : pctOfBand < 0.66 ? "Mid range" : "Top range";
    }
    return { participant: p, recommendation: rec, bandPosition: { pctOfBand, label } };
  });
  let totalCurrentBase = 0;
  let totalProposedBase = 0;
  let counted = 0;
  mapped.forEach((p: any) => {
    if (p.participant.currentBase) totalCurrentBase += p.participant.currentBase;
    if (p.recommendation?.proposedBase) {
      totalProposedBase += p.recommendation.proposedBase;
      counted += 1;
    }
  });
  const budgetSummary = {
    totalCurrentBase,
    totalProposedBase,
    avgIncreasePct: counted && totalCurrentBase ? (totalProposedBase - totalCurrentBase) / totalCurrentBase : 0,
  };
  return { cycle, myParticipants: mapped, budgetSummary };
}

export async function getCompensationHistoryForUser(params: { orgId: string; userId: string }) {
  const assignments = await prisma.compensationBandAssignment.findMany({
    where: { organizationId: params.orgId, userId: params.userId },
    include: { band: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const previousCycles = await prisma.compensationReviewParticipant.findMany({
    where: { organizationId: params.orgId, userId: params.userId },
    include: {
      cycle: true,
      recommendations: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return {
    assignments,
    previousCycles: previousCycles.map((p: any) => ({ cycle: p.cycle, participant: p, recommendation: p.recommendations[0] })),
  };
}
