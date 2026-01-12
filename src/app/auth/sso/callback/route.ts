import { NextResponse } from "next/server";
import { handleOidcCallback, parseSamlResponse } from "@/lib/sso";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect("/signin");
  try {
    const { orgId, userInfo } = await handleOidcCallback(code, state);
    const email = userInfo?.email;
    if (!email) throw new Error("No email in userinfo");
    const user = await findOrCreateUser(email, orgId, userInfo?.name);
    const store = await cookies();
    const secureCookies = process.env.NODE_ENV === "production";
    store.set("ss_user_id", user.id, {
      httpOnly: true,
      sameSite: "strict",
      secure: secureCookies,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.redirect("/app/overview");
  } catch (e) {
    console.error("OIDC callback failed", e);
    return NextResponse.redirect("/signin");
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const samlResponse = form.get("SAMLResponse") as string;
  const relay = form.get("RelayState") as string;
  try {
    const { email, name } = parseSamlResponse(samlResponse);
    const relayJson = JSON.parse(Buffer.from(relay, "base64url").toString("utf8"));
    const orgId = relayJson.orgId as string;
    if (!email) throw new Error("No email in SAML");
    const user = await findOrCreateUser(email, orgId, name);
    const store = await cookies();
    const secureCookies = process.env.NODE_ENV === "production";
    store.set("ss_user_id", user.id, {
      httpOnly: true,
      sameSite: "strict",
      secure: secureCookies,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.redirect("/app/overview");
  } catch (e) {
    console.error("SAML callback failed", e);
    return NextResponse.redirect("/signin");
  }
}

async function findOrCreateUser(email: string, organizationId: string, name?: string) {
  const existing = await prisma.user.findFirst({ where: { email, organizationId } });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash("sso-login-placeholder", 10);
  return prisma.user.create({
    data: {
      email,
      name: name || email,
      passwordHash,
      role: "EMPLOYEE",
      organizationId,
    },
  });
}
