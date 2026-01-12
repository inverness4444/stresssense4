'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ensureOrgSettings } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createJoinInvite } from "@/lib/joinInvites";

export async function updateSettings(formData: FormData) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    redirect("/signin");
  }

  const minResponses = Number(formData.get("minResponsesForBreakdown") || 4);
  const stressMin = Number(formData.get("stressScaleMin") || 1);
  const stressMax = Number(formData.get("stressScaleMax") || 5);
  const timezone = (formData.get("timezone") as string) || null;
  const allowManagerAccessToAllSurveys = formData.get("allowManagerAccessToAllSurveys") === "on";

  await ensureOrgSettings(user.organizationId);

  await prisma.organizationSettings.update({
    where: { organizationId: user.organizationId },
    data: {
      minResponsesForBreakdown: minResponses,
      stressScaleMin: stressMin,
      stressScaleMax: stressMax,
      timezone,
      allowManagerAccessToAllSurveys,
    },
  });

  await logAuditEvent({
    organizationId: user.organizationId,
    userId: user.id,
    action: "SETTINGS_UPDATED",
    targetType: "ORGANIZATION",
    targetId: user.organizationId,
    metadata: { minResponses, stressMin, stressMax, allowManagerAccessToAllSurveys },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/overview");
  return;
}

export async function createJoinInviteToken(inviteRoleRaw: string) {
  const user = await getCurrentUser();
  const userRole = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(userRole)) {
    redirect("/signin");
  }
  const normalized = (inviteRoleRaw ?? "").toString().toUpperCase();
  const inviteRole = ["EMPLOYEE", "MANAGER", "ADMIN"].includes(normalized) ? normalized : "EMPLOYEE";
  const invite = await createJoinInvite({
    organizationId: user.organizationId,
    role: inviteRole,
    createdByUserId: user.id,
  });
  revalidatePath("/app/settings");
  return invite.token;
}
