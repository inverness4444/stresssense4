import { NextResponse } from "next/server";
import { createDemoOrganization } from "@/lib/orgData";
import { assertSameOrigin } from "@/lib/apiAuth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`demo-org:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const orgName = typeof body?.orgName === "string" && body.orgName.trim() ? body.orgName.trim() : "New company";
    const locale = body?.locale === "ru" ? "ru" : "en";
    const secureCookies = process.env.NODE_ENV === "production";
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const { org } = await createDemoOrganization(orgName, email);
    const res = NextResponse.json({ ok: true, orgSlug: org.slug });
    res.cookies.set("ss_user_id", `demo:${org.slug}:manager`, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "strict",
      secure: secureCookies,
    });
    res.cookies.set("ss_demo_mode", "1", { path: "/", maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "strict", secure: secureCookies });
    res.cookies.set("ss_lang", locale, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "strict", secure: secureCookies });
    return res;
  } catch (e) {
    console.error("Failed to create demo org", e);
    return NextResponse.json({ error: "Failed to create demo org" }, { status: 500 });
  }
}
