'use server';

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { markAllAsRead, markNotificationAsRead } from "@/lib/notifications";

export async function markOne(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  await markNotificationAsRead(notificationId, user.id, user.organizationId);
  revalidatePath("/app/notifications");
  return { success: true };
}

export async function markAll() {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  await markAllAsRead(user.id, user.organizationId);
  revalidatePath("/app/notifications");
  return { success: true };
}
