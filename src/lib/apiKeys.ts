import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const PREFIX_LENGTH = 12;

type CreateApiKeyInput = {
  organizationId: string;
  name: string;
  scopes: string[];
  createdById: string;
};

export async function generateApiKey(input: CreateApiKeyInput) {
  const token = `sk_${input.organizationId.slice(0, 6)}_${randomBytes(18).toString("hex")}`;
  const prefix = token.slice(0, PREFIX_LENGTH);
  const tokenHash = await bcrypt.hash(token, 10);

  const key = await prisma.apiKey.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      scopes: input.scopes,
      prefix,
      tokenHash,
      createdById: input.createdById,
    },
  });

  return { token, key };
}

export async function verifyApiKey(token: string) {
  if (!token) return null;
  const prefix = token.slice(0, PREFIX_LENGTH);
  const candidates = await prisma.apiKey.findMany({
    where: { prefix, isActive: true },
    include: {
      organization: {
        include: {
          subscription: { include: { plan: true } },
        },
      },
    },
  });

  for (const key of candidates) {
    const match = await bcrypt.compare(token, key.tokenHash);
    if (match) {
      await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
      return key;
    }
  }
  return null;
}

export function hasRequiredScopes(keyScopes: string[], required: string[]) {
  return required.every((s) => keyScopes.includes(s));
}

export function maskToken(prefix: string) {
  return `${prefix}••••••••••`;
}
