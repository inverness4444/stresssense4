import type { OrganizationSettings } from "@prisma/client";
import { env } from "@/config/env";

export function isFeatureEnabled(flag: string, settings?: OrganizationSettings | null) {
  const flags = (settings?.featureFlags as Record<string, boolean> | null) || (env.featureFlags as Record<string, boolean>);
  if (typeof flags?.[flag] === "boolean") return flags[flag];
  return true;
}
