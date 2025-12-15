import { NextResponse } from "next/server";
import { mobileLogin } from "@/lib/authMobile";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const user = await mobileLogin(body.email, body.password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  return NextResponse.json({ token: user.id, user: { id: user.id, name: user.name, role: user.role, organizationId: user.organizationId } });
}
