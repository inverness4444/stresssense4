import { NextResponse } from "next/server";
import { getSSOConfigForEmail } from "@/lib/sso";

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email: string };
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const found = await getSSOConfigForEmail(email);
  if (!found) return NextResponse.json({ error: "SSO not configured for this domain" }, { status: 404 });
  return NextResponse.json({ orgId: found.org!.id });
}
