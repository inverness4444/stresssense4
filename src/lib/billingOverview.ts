import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays } from "date-fns";

export async function getBillingOverview(orgId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    orderBy: { periodEnd: "desc" },
    take: 10,
  });
  const promoUses = await prisma.promoCode.findMany({
    where: { organizationId: orgId, isActive: true },
    take: 5,
  });
  const referralCodes = await prisma.referralCode.findMany({
    where: { organizationId: orgId },
    take: 5,
  });

  const seatsUsed = await prisma.user.count({ where: { organizationId: orgId, isDeleted: false } });

  const trialDaysLeft =
    subscription?.trialEndsAt && subscription.status === "trialing"
      ? Math.max(0, differenceInCalendarDays(subscription.trialEndsAt, new Date()))
      : null;

  return {
    subscription,
    plan: subscription?.plan,
    invoices,
    promoCodes: promoUses,
    referralCodes,
    seatsUsed,
    trialDaysLeft,
  };
}
