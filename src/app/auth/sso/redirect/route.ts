import { NextResponse } from "next/server";
import { getRedirectUrl } from "@/lib/sso";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.redirect("/signin");
  try {
    const url = await getRedirectUrl(orgId);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("SSO redirect failed", e);
    return NextResponse.redirect("/signin");
  }
}
