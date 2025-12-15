'use server';

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession } from "@/lib/billing";

export async function startCheckout(planId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return { error: "No access" };
  const url = await createCheckoutSession(user.organizationId, planId);
  return { url };
}

export async function handleCheckoutReturn(sessionId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app/billing");
  const sub = await prisma.subscription.findUnique({ where: { organizationId: user.organizationId } });
  await prisma.subscription.update({
    where: { organizationId: user.organizationId },
    data: { status: "active" },
  });
  redirect("/app/billing?status=success");
}
