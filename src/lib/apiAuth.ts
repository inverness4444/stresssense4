import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/url";
import { env } from "@/config/env";

export type ApiAuthResult =
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { error: NextResponse };

export async function requireApiUser(): Promise<ApiAuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export function requireRole(user: { role?: string | null }, roles: string[]): NextResponse | null {
  const role = (user.role ?? "").toUpperCase();
  if (!roles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireOrg(user: { organizationId: string }, orgId?: string | null): NextResponse | null {
  if (!orgId || user.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function assertSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const requestUrl = (() => {
    try {
      return new URL(req.url);
    } catch {
      return null;
    }
  })();
  const requestHost = host ?? requestUrl?.host ?? null;
  const normalize = (value: string) => value.replace(/\/$/, "");
  const base = getBaseUrl();
  const allowed = new Set(
    [base, env.APP_URL, env.client.NEXT_PUBLIC_APP_URL]
      .filter(Boolean)
      .map((url) => normalize(url!))
  );
  if (requestUrl?.origin) {
    allowed.add(normalize(requestUrl.origin));
  }

  if (origin) {
    const normalizedOrigin = normalize(origin);
    if (allowed.has(normalizedOrigin)) {
      return null;
    }
    if (requestHost) {
      try {
        const originHost = new URL(origin).host;
        if (originHost === requestHost) {
          return null;
        }
      } catch {
        // Ignore malformed origin.
      }
    }
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  if (requestHost) {
    const allowedHosts = new Set(
      Array.from(allowed).map((url) => {
        try {
          return new URL(url).host;
        } catch {
          return "";
        }
      })
    );
    if (!allowedHosts.has(requestHost)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  return null;
}
