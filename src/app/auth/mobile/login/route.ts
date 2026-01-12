import { NextResponse } from "next/server";
import { mobileLogin } from "@/lib/authMobile";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`mobile-login:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  const result = await mobileLogin(body.email, body.password);
  if (!result) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  return NextResponse.json({
    token: result.token,
    user: {
      id: result.user.id,
      name: result.user.name,
      role: result.user.role,
      organizationId: result.user.organizationId,
    },
  });
}
