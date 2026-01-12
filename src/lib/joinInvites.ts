import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_DAYS = 7;

export function generateJoinInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function getJoinInviteExpiry() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createJoinInvite(params: { organizationId: string; role: string; createdByUserId?: string | null }) {
  return prisma.joinInvite.create({
    data: {
      token: generateJoinInviteToken(),
      role: params.role,
      organizationId: params.organizationId,
      createdByUserId: params.createdByUserId ?? null,
      expiresAt: getJoinInviteExpiry(),
    },
  });
}

export async function consumeJoinInvite(token: string, role: string) {
  const invite = await prisma.joinInvite.findUnique({ where: { token } });
  if (!invite) return null;
  if (invite.usedAt) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;
  if (invite.role !== role) return null;
  return prisma.joinInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });
}
