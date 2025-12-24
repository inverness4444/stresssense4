import { NextResponse } from "next/server";
import { createDemoOrganization } from "@/lib/orgData";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const orgName = typeof body?.orgName === "string" && body.orgName.trim() ? body.orgName.trim() : "New company";
    const locale = body?.locale === "ru" ? "ru" : "en";
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const { org } = await createDemoOrganization(orgName, email);
    const res = NextResponse.json({ ok: true, orgSlug: org.slug });
    res.cookies.set("ss_user_id", `demo:${org.slug}:manager`, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
    });
    res.cookies.set("ss_demo_mode", "1", { path: "/", maxAge: 60 * 60 * 24 });
    res.cookies.set("ss_lang", locale, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (e) {
    console.error("Failed to create demo org", e);
    return NextResponse.json({ error: "Failed to create demo org" }, { status: 500 });
  }
}
