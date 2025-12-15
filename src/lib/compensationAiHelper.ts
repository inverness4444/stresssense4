import { prisma } from "@/lib/prisma";
import { sanitizeTextForAI } from "@/lib/aiPrivacy";

type Suggestion = {
  proposedBandId?: string;
  proposedBase?: number;
  proposedBonusPct?: number;
  rationale: string;
  warnings: string[];
};

export async function suggestCompRecommendation(params: { orgId: string; cycleId: string; participantId: string }): Promise<Suggestion> {
  const participant = await prisma.compensationReviewParticipant.findFirst({
    where: { id: params.participantId, organizationId: params.orgId },
    include: { currentBand: true, user: true },
  });
  if (!participant) return { rationale: "No participant found", warnings: [] };

  const band = participant.currentBand;
  const base = participant.currentBase ?? band?.midBase ?? band?.minBase ?? 0;
  // Simple heuristic if no AI provider plugged: keep in range near midpoint
  let proposedBase = base;
  if (band) {
    const mid = band.midBase ?? (band.minBase + band.maxBase) / 2;
    proposedBase = Math.min(band.maxBase, Math.max(band.minBase, mid));
  }
  // If AI provider exists in project, here we could call it with sanitized context.
  const rationaleParts = [`Suggested to keep within band ${band?.key ?? ""}`, "Consider performance and budget before approving."];
  return {
    proposedBandId: participant.currentBandId ?? undefined,
    proposedBase,
    proposedBonusPct: participant.currentBonusPct ?? undefined,
    rationale: rationaleParts.join(" "),
    warnings: [],
  };
}

export async function summarizeCompCycleForExec(params: { orgId: string; cycleId: string }) {
  const recs = await prisma.compensationReviewRecommendation.findMany({
    where: { organizationId: params.orgId, cycleId: params.cycleId, status: { in: ["submitted", "approved_manager", "approved_hr"] } },
    include: { participant: true },
  });
  const count = recs.length;
  let avgDelta = 0;
  recs.forEach((r) => {
    if (r.participant.currentBase && r.proposedBase) {
      avgDelta += (r.proposedBase - r.participant.currentBase) / r.participant.currentBase;
    }
  });
  const summary = `В обзоре ${count} рекомендаций, среднее повышение ${(count && avgDelta ? (avgDelta / count) * 100 : 0).toFixed(1)}%. Проверьте выходы за диапазон и бюджет.`;
  return { summary, risks: [], highlights: [] };
}
