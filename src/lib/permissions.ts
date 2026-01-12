import type { Role, User } from "@prisma/client";

export const PERMISSIONS = [
  "org.manage",
  "branding.manage",
  "employees.read",
  "employees.manage",
  "teams.read",
  "teams.manage",
  "surveys.read",
  "surveys.create",
  "surveys.close",
  "surveys.respond",
  "analytics.read",
  "automation.manage",
  "integrations.manage",
  "billing.read",
  "billing.manage",
  "api.manage",
  "ai.use",
  "marketplace.install",
  "marketplace.manage",
  "partner.manage",
  "projects.manage",
  "projects.view",
  "billing.view",
  "billing.manage",
  "growth.referrals.manage",
  "feedback.read",
  "flags.manage",
  "support.impersonate",
  "crm.manage",
] as const;

const roleDefaults: Record<string, string[]> = {
  ADMIN: [...PERMISSIONS],
  SUPER_ADMIN: [...PERMISSIONS],
  MANAGER: ["surveys.read", "surveys.respond", "analytics.read", "teams.read", "employees.read", "ai.use"],
  EMPLOYEE: ["surveys.respond"],
};

export function hasPermission(
  user: User & { roles?: (Role & { permissions: string[] })[] },
  permission: (typeof PERMISSIONS)[number]
) {
  if (!user) return false;
  if (roleDefaults[user.role]?.includes(permission)) return true;
  if (user.roles?.some((r) => r.permissions.includes(permission))) return true;
  return false;
}
