import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role)) {
    redirect("/app/overview");
  }
  return user;
}

export async function assertSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
