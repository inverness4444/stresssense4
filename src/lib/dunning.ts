import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";

export async function markPaymentFailed(organizationId: string) {
  const state = await prisma.dunningState.upsert({
    where: { organizationId },
    update: { failedAttempts: { increment: 1 }, status: "soft", lastReminderAt: new Date() },
    create: { organizationId, status: "soft", failedAttempts: 1 },
  });
  await addJob("sendEmails", {
    items: [
      {
        organizationId,
        type: "dunning",
      },
    ],
  });
  if (state.failedAttempts >= 3) {
    await prisma.subscription.updateMany({ where: { organizationId }, data: { status: "past_due" } });
    await prisma.dunningState.update({ where: { organizationId }, data: { status: "hard" } });
  }
}

export async function resetDunningOnPaymentSuccess(organizationId: string) {
  await prisma.dunningState.deleteMany({ where: { organizationId } });
}
