import { prisma } from "./prisma";
import { logAuditEvent } from "./audit";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export async function exportUserData(userId: string, organizationId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: {
      userTeams: { include: { team: true } },
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
  const adminRoles = ["ADMIN", "HR", "SUPER_ADMIN"];
  let adminCount = 0;
  try {
    adminCount = await prisma.user.count({
      where: { organizationId, role: { in: adminRoles }, isDeleted: false },
    });
  } catch {
    adminCount = await prisma.user.count({
      where: { organizationId, role: { in: adminRoles } },
    });
  }
  if (adminRoles.includes((user.role ?? "").toUpperCase()) && adminCount <= 1) {
    throw new Error("Need at least one active admin.");
  }

  const replacement = `deleted-user-${randomBytes(6).toString("hex")}`;
  const replacementHash = await bcrypt.hash(randomBytes(12).toString("hex"), 10);
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `${replacement}@deleted.local`,
      name: replacement,
      passwordHash: replacementHash,
    },
  });

  await logAuditEvent({
    organizationId,
    userId: actorId,
    action: "USER_ANONYMIZED",
    targetType: "USER",
    targetId: userId,
    metadata: { replacement },
  });
}
