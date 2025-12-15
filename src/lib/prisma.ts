import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";

type Region = "eu" | "us" | "apac" | string;

const globalForPrisma = globalThis as unknown as {
  prismaDefault?: PrismaClient;
  prismaByRegion?: Record<string, PrismaClient>;
};

function newClient(url?: string) {
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

const defaultClient = globalForPrisma.prismaDefault ?? newClient(env.DATABASE_URL);
const byRegion: Record<string, PrismaClient> = globalForPrisma.prismaByRegion ?? {};

function resolveUrl(region: Region): string | undefined {
  if (region === "us") return env.DATABASE_URL_US ?? env.DATABASE_URL;
  if (region === "apac") return env.DATABASE_URL_APAC ?? env.DATABASE_URL;
  return env.DATABASE_URL_EU ?? env.DATABASE_URL;
}

export function getPrismaClientForRegion(region?: Region) {
  const key = region ?? "default";
  if (byRegion[key]) return byRegion[key];
  const url = resolveUrl(region ?? "eu");
  byRegion[key] = newClient(url);
  return byRegion[key];
}

export const prisma = defaultClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaDefault = defaultClient;
  globalForPrisma.prismaByRegion = byRegion;
}
