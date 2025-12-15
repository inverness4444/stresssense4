import { prisma } from "@/lib/prisma";

const PREMIUM_FEATURES = [
  "ai.summary",
  "ai.assistant",
  "integrations.slack",
  "integrations.hris",
  "marketplace.install",
  "automation.workflows",
  "risk.analytics",
  "api.access",
  "kiosks",
];

export async function canUseFeature(organizationId: string, featureKey: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: { include: { plan: true } },
      organizationAddOns: { include: { addOn: true } },
    },
  });
  if (!org) return false;

  const subs = org.subscription;
  const planFeatures = subs?.plan?.featureKeys ?? [];
  const addonFeatures = org.organizationAddOns.flatMap((o) => o.addOn.featureKeys ?? []);
  const hasFeature = planFeatures.includes(featureKey) || addonFeatures.includes(featureKey);

  // Trial check
  const now = new Date();
  const trialActive = org.trialEndsAt && org.trialEndsAt > now && subs?.isTrial;
  const subsActive = subs && ["active", "trialing"].includes(subs.status);
  if (!trialActive && !subsActive && PREMIUM_FEATURES.includes(featureKey)) return false;

  return hasFeature || trialActive;
}
