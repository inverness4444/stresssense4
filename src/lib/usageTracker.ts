import { prisma } from "@/lib/prisma";

export async function recordUsage(
  organizationId: string,
  metric: "seats" | "ai_requests" | "automation_runs" | "api_calls" | "ai_coach_requests",
  value = 1
) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  await prisma.usageRecord.create({
    data: {
      organizationId,
      periodStart,
      periodEnd,
      metric,
      value,
    },
  });
}

export async function updateUsedSeats(organizationId: string) {
  const seats = await prisma.user.count({
    where: { organizationId, role: "EMPLOYEE", isDeleted: false },
  });
  await prisma.subscription.updateMany({
    where: { organizationId },
    data: { usedSeats: seats },
  });
  await recordUsage(organizationId, "seats", seats);
}
