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
      subscription: true,
      organizationAddOns: { include: { addOn: true } },
    },
  });
  if (!org) return false;

  const subs = org.subscription;
  const addonFeatures = org.organizationAddOns.flatMap((o: any) => o.addOn.featureKeys ?? []);
  const hasAddonFeature = addonFeatures.includes(featureKey);

  // Trial check
  const now = new Date();
  const trialActive = org.trialEndsAt && org.trialEndsAt > now && subs?.isTrial;
  const subsActive = subs && ["active", "trialing"].includes(subs.status);
  if (!trialActive && !subsActive && PREMIUM_FEATURES.includes(featureKey) && !hasAddonFeature) return false;

  if (hasAddonFeature) return true;
  if (!PREMIUM_FEATURES.includes(featureKey)) return true;
  return Boolean(trialActive || subsActive);
}
