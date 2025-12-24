import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "New user";
    const company = typeof body?.company === "string" && body.company.trim() ? body.company.trim() : `${name}'s workspace`;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
    if (!user) {
      const baseSlug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `org-${Date.now()}`;
      let slug = baseSlug;
      let attempt = 0;
      while (attempt < 5) {
        const existingOrg = await prisma.organization.findUnique({ where: { slug } });
        if (!existingOrg) break;
        attempt += 1;
        slug = `${baseSlug}-${Math.floor(Math.random() * 9000 + 1000)}`;
      }
      const org = await prisma.organization.create({
        data: { name: company, slug, inviteToken: crypto.randomBytes(24).toString("hex"), isDemo: false },
      });
      const hash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hash,
          organizationId: org.id,
          role: "HR",
        },
      });
    } else {
      // ensure password hash exists/updated for returning users
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("bootstrap-user failed", e);
    return NextResponse.json({ error: "Failed to prepare account" }, { status: 500 });
  }
}
