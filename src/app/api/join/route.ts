import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

const allowedRoles = ["employee", "manager", "admin"] as const;
const mapRole = (role: (typeof allowedRoles)[number]) => {
  if (role === "admin") return "HR";
  if (role === "manager") return "Manager";
  return "Employee";
};
const redirectForRole = (role?: string | null) => {
  const upper = (role ?? "").toUpperCase();
  if (["ADMIN", "HR", "MANAGER"].includes(upper)) return "/app/overview";
  return "/app/my/home";
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const inviteToken = typeof body?.inviteToken === "string" ? body.inviteToken.trim() : "";
    const roleParam = typeof body?.role === "string" ? (body.role.trim().toLowerCase() as any) : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!slug || !inviteToken || !allowedRoles.includes(roleParam)) {
      return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    }

    const org = await prisma.organization.findFirst({
      where: { inviteToken, AND: [{ OR: [{ slug }, { id: slug }] }] },
    }) ?? (await prisma.organization.findFirst({ where: { inviteToken } }));
    if (!org) {
      return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    }
    const targetRole = mapRole(roleParam);

    const sessionUserId = (session?.user as any)?.id as string | undefined;
    if (sessionUserId) {
    const existing = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!existing) return NextResponse.json({ error: "user_not_found" }, { status: 400 });
    if (existing.organizationId === org.id && (existing.role ?? "").toUpperCase() === "HR") {
      return NextResponse.json({ ok: true, owner: true, redirect: redirectForRole(existing.role) });
    }
    if (existing.organizationId !== org.id) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { organizationId: org.id, role: targetRole },
      });
    }
    return NextResponse.json({ ok: true, redirect: redirectForRole(targetRole) });
  }

    if (!email || !password || !name) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      const ok = await bcrypt.compare(password, existingByEmail.passwordHash ?? "");
      if (!ok) {
        return NextResponse.json({ error: "email_exists" }, { status: 400 });
      }
      if (existingByEmail.organizationId !== org.id) {
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { organizationId: org.id, role: targetRole },
        });
      }
      return NextResponse.json({ ok: true, redirect: redirectForRole(targetRole), existing: true });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hash,
        organizationId: org.id,
        role: targetRole,
      },
    });

    return NextResponse.json({ ok: true, redirect: redirectForRole(newUser.role), created: true });
  } catch (e) {
    console.error("join failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
