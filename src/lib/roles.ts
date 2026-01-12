import { t, type Locale } from "@/lib/i18n";

export const USER_ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN" as const;
export const ADMIN_LIKE_ROLES = ["ADMIN", "HR", SUPER_ADMIN_ROLE] as const;

export function normalizeRole(role?: string | null) {
  return (role ?? "").toUpperCase();
}

export function isSuperAdmin(role?: string | null) {
  return normalizeRole(role) === SUPER_ADMIN_ROLE;
}

export function isAdminLike(role?: string | null) {
  return ADMIN_LIKE_ROLES.includes(normalizeRole(role) as (typeof ADMIN_LIKE_ROLES)[number]);
}

export function isManagerLike(role?: string | null) {
  return ["MANAGER", SUPER_ADMIN_ROLE].includes(normalizeRole(role));
}

export function getRoleLabel(role?: string | null, locale: Locale = "en") {
  const normalized = normalizeRole(role);
  if (normalized === "SUPER_ADMIN") return locale === "ru" ? "Супер-админ" : "Super admin";
  if (normalized === "ADMIN") return t(locale, "employeesRoleAdmin");
  if (normalized === "HR") return t(locale, "employeesRoleAdmin");
  if (normalized === "MANAGER") return t(locale, "employeesRoleManager");
  if (normalized === "EMPLOYEE") return t(locale, "employeesRoleEmployee");
  return role ?? "-";
}
