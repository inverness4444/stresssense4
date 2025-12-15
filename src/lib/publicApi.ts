import { NextResponse } from "next/server";
import { verifyApiKey, hasRequiredScopes } from "./apiKeys";
import { rateLimit } from "./rateLimit";

export type ApiAuthResult =
  | { key: Awaited<ReturnType<typeof verifyApiKey>> }
  | { error: NextResponse };

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function authenticateApiRequest(req: Request, scopes: string[]): Promise<ApiAuthResult> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return { error: errorResponse("UNAUTHORIZED", "Missing API key", 401) };
  }

  const key = await verifyApiKey(token);
  if (!key) {
    return { error: errorResponse("UNAUTHORIZED", "Invalid API key", 401) };
  }

  const rl = rateLimit(`public:${key.id}`, { limit: 100, windowMs: 60_000 });
  if (!rl.allowed) {
    return { error: errorResponse("RATE_LIMITED", "Rate limit exceeded", 429) };
  }

  if (!hasRequiredScopes(key.scopes, scopes)) {
    return { error: errorResponse("FORBIDDEN", "Missing required scope", 403) };
  }

  return { key };
}
