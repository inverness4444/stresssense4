import { prisma } from "@/lib/prisma";

export async function isFeatureEnabled(
  featureKey: string,
  opts: { organizationId?: string; userId?: string; environment?: string } = {}
) {
  const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } });
  if (!flag) {
    // default-on for cockpits in absence of explicit flag
    if (
      featureKey === "manager_cockpit_v1" ||
      featureKey === "employee_cockpit_v1" ||
      featureKey === "growth_module_v1"
    )
      return true;
    return false;
  }
  const override = await prisma.featureFlagOverride.findFirst({
    where: {
      featureKey,
      OR: [
        { organizationId: opts.organizationId },
        { userId: opts.userId },
        { environment: opts.environment },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  if (override) return override.enabled;
  return flag.defaultEnabled;
}
