import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getSlackAuthUrl } from "@/lib/slack";
import { cookies } from "next/headers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return NextResponse.redirect("/signin");

  const nonce = crypto.randomBytes(12).toString("hex");
  const store = await cookies();
  store.set("slack_state", nonce, { httpOnly: true, path: "/", maxAge: 300 });
  const url = getSlackAuthUrl(user.organizationId, nonce);
  return NextResponse.redirect(url);
}
