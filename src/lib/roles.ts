export const USER_ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;
export type UserRole = (typeof USER_ROLES)[number];
