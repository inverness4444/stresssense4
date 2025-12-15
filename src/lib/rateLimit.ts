const store = new Map<string, { count: number; expires: number }>();

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.expires < now) {
    store.set(key, { count: 1, expires: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  store.set(key, entry);
  return { allowed: true, remaining: limit - entry.count };
}
