import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { JoinWorkspaceClient } from "./JoinWorkspaceClient";

const ALLOWED_ROLES = ["employee", "manager", "admin"] as const;
type RoleParam = (typeof ALLOWED_ROLES)[number];

type Params = { workspaceSlug: string; role: string; inviteToken: string };

export default async function JoinWorkspacePage({ params }: { params: Promise<Params> }) {
  const { workspaceSlug, role, inviteToken } = await params;
  const roleParam = role as RoleParam;
  if (!ALLOWED_ROLES.includes(roleParam)) {
    return invalidLink();
  }

  const user = await getCurrentUser();
  const invite = await prisma.joinInvite.findUnique({
    where: { token: inviteToken },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });

  if (invite) {
    const expired = invite.expiresAt.getTime() < Date.now();
    if (invite.usedAt || expired) return invalidLink();
    if (invite.organization.slug !== workspaceSlug && invite.organization.id !== workspaceSlug) {
      return invalidLink();
    }
    const inviteRole = invite.role.toLowerCase() as RoleParam;
    if (inviteRole !== roleParam) return invalidLink();

    const isOwner = user && user.organizationId === invite.organization.id && (user.role ?? "").toUpperCase() === "HR";
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-14">
        <JoinWorkspaceClient
          workspaceName={invite.organization.name}
          workspaceSlug={invite.organization.slug}
          inviteToken={invite.token}
          role={inviteRole}
          isAuthenticated={!!user}
          userEmail={(user as any)?.email ?? null}
          isOwner={isOwner}
        />
      </div>
    );
  }

  const legacy = await prisma.organization.findFirst({
    where: {
      inviteToken,
      OR: [{ slug: workspaceSlug }, { id: workspaceSlug }],
    },
    select: { id: true, name: true, slug: true, inviteToken: true },
  });

  if (!legacy) {
    return invalidLink();
  }

  const isOwner = user && user.organizationId === legacy.id && (user.role ?? "").toUpperCase() === "HR";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-14">
      <JoinWorkspaceClient
        workspaceName={legacy.name}
        workspaceSlug={legacy.slug}
        inviteToken={legacy.inviteToken ?? ""}
        role={roleParam}
        isAuthenticated={!!user}
        userEmail={(user as any)?.email ?? null}
        isOwner={isOwner}
      />
    </div>
  );
}

function invalidLink() {
  return (
    <div className="mx-auto mt-16 max-w-xl space-y-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
      <p className="text-xl font-semibold text-slate-900">Ссылка недействительна или устарела</p>
      <p className="text-sm text-slate-600">Попросите владельца компании отправить новую ссылку.</p>
      <div className="mt-3 flex justify-center gap-3">
        <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105">
          Вернуться к логину
        </Link>
        <Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-primary/40 hover:text-primary">
          На главную
        </Link>
      </div>
    </div>
  );
}
