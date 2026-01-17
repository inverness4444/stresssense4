import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { assertSameOrigin } from "@/lib/apiAuth";
import { rateLimit } from "@/lib/rateLimit";
import { ensureMemberForUser } from "@/lib/members";

export const runtime = "nodejs";

const allowedRoles = ["employee", "manager", "admin"] as const;
const mapRole = (role: (typeof allowedRoles)[number]) => {
  if (role === "admin") return "ADMIN";
  if (role === "manager") return "MANAGER";
  return "EMPLOYEE";
};
const redirectForRole = (role?: string | null) => {
  const upper = (role ?? "").toUpperCase();
  if (["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(upper)) return "/app/overview";
  return "/app/my/home";
};

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`join:${ip}`, { limit: 40, windowMs: 60_000 });
    if (!limiter.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
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

    const joinInvite = await prisma.joinInvite.findUnique({
      where: { token: inviteToken },
      include: { organization: true },
    });

    let org = null as typeof joinInvite | { organization: { id: string; name: string; slug: string } } | null;
    let joinInviteId: string | null = null;
    let joinInviteRole: string | null = null;
    if (joinInvite) {
      const expired = joinInvite.expiresAt.getTime() < Date.now();
      if (joinInvite.usedAt || expired) {
        return NextResponse.json({ error: "invalid_link" }, { status: 400 });
      }
      if (joinInvite.organization.slug !== slug && joinInvite.organization.id !== slug) {
        return NextResponse.json({ error: "invalid_link" }, { status: 400 });
      }
      org = joinInvite;
      joinInviteId = joinInvite.id;
      joinInviteRole = joinInvite.role;
    } else {
      const legacyOrg = await prisma.organization.findFirst({
        where: { inviteToken, AND: [{ OR: [{ slug }, { id: slug }] }] },
        select: { id: true, name: true, slug: true },
      });
      if (legacyOrg) {
        org = { organization: legacyOrg } as any;
      }
    }

    if (!org) {
      return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    }
    const targetRole = mapRole(roleParam);
    if (joinInviteRole && joinInviteRole !== targetRole) {
      return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    }

    const hasCredentials = Boolean(email && password && name);
    if (!hasCredentials) {
      const sessionUserId = (session?.user as any)?.id as string | undefined;
      if (sessionUserId) {
        const existing = await prisma.user.findUnique({ where: { id: sessionUserId } });
        if (!existing) return NextResponse.json({ error: "user_not_found" }, { status: 400 });
        if (existing.organizationId !== org.organization.id) {
          return NextResponse.json({ error: "account_in_other_org" }, { status: 400 });
        }
        if ((existing.role ?? "").toUpperCase() === "HR") {
          await ensureMemberForUser(existing);
          return NextResponse.json({ ok: true, owner: true, redirect: redirectForRole(existing.role) });
        }
        if (joinInviteId) {
          const now = new Date();
          const consumed = await prisma.joinInvite.updateMany({
            where: { id: joinInviteId, usedAt: null, expiresAt: { gte: now } },
            data: { usedAt: now },
          });
        if (!consumed.count) {
          return NextResponse.json({ error: "invalid_link" }, { status: 400 });
        }
      }
      await ensureMemberForUser(existing);
      return NextResponse.json({ ok: true, redirect: redirectForRole(existing.role) });
    }
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      const ok = await bcrypt.compare(password, existingByEmail.passwordHash ?? "");
      if (!ok) {
        return NextResponse.json({ error: "email_exists" }, { status: 400 });
      }
      if (existingByEmail.organizationId !== org.organization.id) {
        const existingRole = (existingByEmail.role ?? "").toUpperCase();
        if (["ADMIN", "HR", "SUPER_ADMIN"].includes(existingRole)) {
          return NextResponse.json({ error: "account_in_other_org" }, { status: 400 });
        }
        const movedUser = await prisma.$transaction(async (tx: any) => {
          await tx.userTeam.deleteMany({ where: { userId: existingByEmail.id } });
          await tx.member.updateMany({
            where: { userId: existingByEmail.id, organizationId: { not: org.organization.id } },
            data: { userId: null },
          });
          const updated = await tx.user.update({
            where: { id: existingByEmail.id },
            data: {
              organizationId: org.organization.id,
              role: targetRole,
            },
          });
          if (joinInviteId) {
            const now = new Date();
            const consumed = await tx.joinInvite.updateMany({
              where: { id: joinInviteId, usedAt: null, expiresAt: { gte: now } },
              data: { usedAt: now },
            });
            if (!consumed.count) {
              throw new Error("invite_invalid");
            }
          }
          return updated;
        });

        await ensureMemberForUser(movedUser);
        return NextResponse.json({
          ok: true,
          redirect: redirectForRole(movedUser.role),
          existing: true,
          migrated: true,
        });
      }
      if (joinInviteId) {
        const now = new Date();
        const consumed = await prisma.joinInvite.updateMany({
          where: { id: joinInviteId, usedAt: null, expiresAt: { gte: now } },
          data: { usedAt: now },
        });
      if (!consumed.count) {
        return NextResponse.json({ error: "invalid_link" }, { status: 400 });
      }
    }
    await ensureMemberForUser(existingByEmail);
    return NextResponse.json({ ok: true, redirect: redirectForRole(existingByEmail.role), existing: true });
  }

    const hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.$transaction(async (tx: any) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          passwordHash: hash,
          organizationId: org.organization.id,
          role: targetRole,
        },
      });
      if (joinInviteId) {
        const now = new Date();
        const consumed = await tx.joinInvite.updateMany({
          where: { id: joinInviteId, usedAt: null, expiresAt: { gte: now } },
          data: { usedAt: now },
        });
        if (!consumed.count) {
          throw new Error("invite_invalid");
        }
      }
      return created;
    });

    await ensureMemberForUser(newUser);
    return NextResponse.json({ ok: true, redirect: redirectForRole(newUser.role), created: true });
  } catch (e: any) {
    if (e?.message === "invite_invalid") {
      return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    }
    console.error("join failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
