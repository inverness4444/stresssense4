'use server';

import { redirect } from "next/navigation";
import { anonymizeUser } from "@/lib/gdpr";
import { getCurrentUser } from "@/lib/auth";

export async function anonymize(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/signin");
  const targetId = formData.get("userId") as string;
  await anonymizeUser(targetId, user.organizationId, user.id);
  redirect("/app/employees");
}
