import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

export function isSuperAdminRole(role?: string | null) {
  return role === "SUPER_ADMIN";
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdminRole(user.role)) {
    redirect("/app/overview");
  }
  return user;
}

export function assertSuperAdmin(user?: { role?: string | null }) {
  if (!user || !isSuperAdminRole(user.role)) {
    throw new Error("Forbidden");
  }
}
