'use server';

import { redirect } from "next/navigation";
import { anonymizeUser } from "@/lib/gdpr";
import { getCurrentUser } from "@/lib/auth";

export async function anonymize(formData: FormData) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR"].includes(role)) redirect("/signin");
  const targetId = formData.get("userId") as string;
  await anonymizeUser(targetId, user.organizationId, user.id);
  redirect("/app/employees");
}
