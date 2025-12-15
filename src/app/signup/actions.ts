'use server';

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { recordLifecycleEvent } from "@/lib/crmSync";

const DEFAULT_TASKS = [
  { key: "create_first_survey", title: "Create your first stress pulse" },
  { key: "invite_employees", title: "Invite employees or managers" },
  { key: "connect_slack", title: "Connect Slack" },
  { key: "set_up_hris", title: "Set up HRIS sync" },
];

export async function signupAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();
  const size = (formData.get("size") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  const trial = formData.get("trial") === "on" || formData.get("trial") === "true";
  const referralCode = (formData.get("ref") as string)?.trim();
  if (!email || !password || !name || !company) {
    throw new Error("Missing fields");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already exists");
  }

  const planKey = (formData.get("plan") as string) || undefined;
  const promoCode = (formData.get("promoCode") as string)?.trim();
  const plan = planKey
    ? await prisma.plan.findFirst({ where: { key: planKey } })
    : await prisma.plan.findFirst({ orderBy: { createdAt: "asc" } });
  const org = await prisma.organization.create({
    data: {
      name: company,
      signupSource: "self_serve",
      lifecycleStage: trial ? "trial" : "lead",
      trialStartedAt: trial ? new Date() : null,
      trialEndsAt: trial ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: plan?.id,
      status: trial ? "trialing" : "active",
      isTrial: trial,
      trialEndsAt: org.trialEndsAt,
    },
  });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: hash,
      organizationId: org.id,
      role: "ADMIN",
    },
  });

  await prisma.onboardingTask.createMany({
    data: DEFAULT_TASKS.map((t) => ({ ...t, organizationId: org.id })),
  });

  if (promoCode) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: promoCode,
        isActive: true,
        OR: [{ organizationId: null }, { organizationId: org.id }],
        AND: [
          { validFrom: { lte: new Date() } },
          { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
        ],
      },
    });
    if (promo) {
      await prisma.promoCode.update({ where: { id: promo.id }, data: { redemptions: { increment: 1 } } });
      await prisma.subscription.updateMany({
        where: { organizationId: org.id },
        data: { cancelReason: `PROMO:${promo.code}` },
      });
    }
  }
  if (referralCode) {
    const ref = await prisma.referralCode.findUnique({ where: { code: referralCode } });
    if (ref) {
      await prisma.referralRedemption.create({
        data: {
          referralCodeId: ref.id,
          referredOrgId: org.id,
        },
      });
    }
  }

  await recordLifecycleEvent(org.id, "TRIAL_STARTED");
  redirect("/signin");
}
