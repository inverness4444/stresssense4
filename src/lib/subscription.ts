import { prisma } from "./prisma";

export async function getOrgSubscription(orgId: string) {
  let sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });
  if (!sub) {
    const freePlan = await prisma.plan.findFirst({ where: { name: "Free" } });
    sub = await prisma.subscription.create({
      data: {
        organizationId: orgId,
        status: "active",
        planId: freePlan?.id,
      },
      include: { plan: true },
    });
  }
  return sub;
}

export function checkLimit(count: number, limit?: number | null) {
  if (limit == null) return true;
  return count < limit;
}
