import { prisma } from "./prisma";
import { logAuditEvent } from "./audit";
import { randomBytes } from "crypto";

export async function exportUserData(userId: string, organizationId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: {
      teams: { include: { team: true } },
      attributes: { include: { attribute: true } },
    },
  });
  if (!user) throw new Error("User not found");
  const responses = await prisma.surveyResponse.findMany({
    where: { inviteToken: { userId } },
    include: { survey: true, answers: true },
  });
  return { user, responses };
}

export async function anonymizeUser(userId: string, organizationId: string, actorId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) throw new Error("User not found");
  const adminCount = await prisma.user.count({ where: { organizationId, role: "ADMIN", isDeleted: false } });
  if (user.role === "ADMIN" && adminCount <= 1) throw new Error("Need at least one active admin.");

  const replacement = `deleted-user-${randomBytes(6).toString("hex")}`;
  await prisma.$transaction([
    prisma.employeeAttributeValue.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `${replacement}@deleted.local`,
        name: replacement,
        jobTitle: null,
        department: null,
        location: null,
        employeeId: null,
        slackUserId: null,
        preferredLanguage: null,
        managerId: null,
        isDeleted: true,
      },
    }),
  ]);

  await logAuditEvent({
    organizationId,
    userId: actorId,
    action: "USER_ANONYMIZED",
    targetType: "USER",
    targetId: userId,
    metadata: { replacement },
  });
}
