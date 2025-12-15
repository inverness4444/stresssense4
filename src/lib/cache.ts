import { env } from "@/config/env";

const memory = new Map<string, { value: any; expires: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memory.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function setCache(key: string, value: any, ttlSeconds = 60) {
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export async function invalidateCache(key: string) {
  memory.delete(key);
}
