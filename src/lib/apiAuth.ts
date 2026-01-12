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
  const host = req.headers.get("host");
  const base = getBaseUrl();
  const allowed = new Set(
    [base, env.APP_URL, env.client.NEXT_PUBLIC_APP_URL]
      .filter(Boolean)
      .map((url) => url!.replace(/\/$/, ""))
  );

  if (origin) {
    if (!allowed.has(origin.replace(/\/$/, ""))) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
    return null;
  }

  if (host) {
    const allowedHosts = new Set(
      Array.from(allowed).map((url) => {
        try {
          return new URL(url).host;
        } catch {
          return "";
        }
      })
    );
    if (!allowedHosts.has(host)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  return null;
}
