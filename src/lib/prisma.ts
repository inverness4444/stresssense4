import "server-only";
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

type NoopReturn = any;
const noopModel = new Proxy(
  {},
  {
    get(_target, method) {
      return async (..._args: any[]): Promise<NoopReturn> => {
        if (method === "count") return 0;
        if (method === "createMany") return { count: 0 };
        return null as NoopReturn;
      };
    },
  },
);


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

export const prisma: any = new Proxy(defaultClient, {
  get(target, prop, receiver) {
    const value = Reflect.get(target as any, prop, receiver);
    if (value !== undefined) return value;
    return noopModel;
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaDefault = defaultClient;
  globalForPrisma.prismaByRegion = byRegion;
}
