import Link from "next/link";
import { notFound } from "next/navigation";
import { EditTeamModal } from "@/components/app/EditTeamModal";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { getRoleLabel } from "@/lib/roles";

type Props = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  const locale = await getLocale();
  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in to view this team.</p>
      </div>
    );
  }

  const hiddenRole = "SUPER_ADMIN";
  const resolvedParams = await Promise.resolve(params);
  const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;
  const teamId = typeof rawId === "string" ? decodeURIComponent(rawId).trim() : "";
  if (!teamId) {
    notFound();
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: currentUser.organizationId },
    include: {
      users: {
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const allUsers = await prisma.user.findMany({
    where: { organizationId: currentUser.organizationId, role: { not: hiddenRole } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const normalizedRole = (currentUser.role ?? "").toUpperCase();
  const isAdmin = ["ADMIN", "HR", "SUPER_ADMIN"].includes(normalizedRole);
  const members = team.users
    .map((u: any) => u.user)
    .filter((member: any) => (member?.role ?? "").toUpperCase() !== hiddenRole);
  const canManage = ["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(normalizedRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/app/teams"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-primary transition hover:underline"
          >
            Back to teams
          </Link>
          <h2 className="text-2xl font-semibold text-slate-900">{team.name}</h2>
          {team.description && (
            <p className="text-sm text-slate-600">{team.description}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {members.length} member{members.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <EditTeamModal
              teamId={team.id}
              initialName={team.name}
              initialDescription={team.description}
              members={members.map((m: any) => ({ id: m.id }))}
              users={allUsers}
              locale={locale}
            />
            <button
              disabled
              className="cursor-not-allowed rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
              title="Deleting teams will be available later"
            >
              Delete team
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Email", "Role"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member: any) => (
              <tr key={member.id} className="transition hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {member.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{member.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-700">
                    {getRoleLabel(member.role, locale)}
                  </span>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-slate-600"
                >
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
