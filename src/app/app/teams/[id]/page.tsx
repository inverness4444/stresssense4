import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/app/AccessDenied";
import { EditTeamModal } from "@/components/app/EditTeamModal";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { id: string };
};

export default async function TeamDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in to view this team.</p>
      </div>
    );
  }

  const team = await prisma.team.findFirst({
    where: { id: params.id, organizationId: currentUser.organizationId },
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
    where: { organizationId: currentUser.organizationId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const isAdmin = currentUser.role === "ADMIN";
  const members = team.users.map((u: any) => u.user);

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
        {isAdmin && (
          <div className="flex items-center gap-2">
            <EditTeamModal
              teamId={team.id}
              initialName={team.name}
              initialDescription={team.description}
              members={members.map((m: any) => ({ id: m.id }))}
              users={allUsers}
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

      {!isAdmin && (
        <>
          <AccessDenied />
          <p className="text-sm text-slate-600">Admins can manage team details.</p>
        </>
      )}

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
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
                        {member.role}
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

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Stress snapshot (coming soon)</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase text-slate-700">
                  Preview
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p className="flex items-center justify-between rounded-xl bg-indigo-50/60 px-3 py-2">
                  <span>Average stress index</span>
                  <span className="font-semibold text-slate-900">62</span>
                </p>
                <p className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>Participation</span>
                  <span className="font-semibold text-slate-900">78%</span>
                </p>
                <p className="flex items-center justify-between rounded-xl bg-emerald-50/70 px-3 py-2">
                  <span>Trend</span>
                  <span className="font-semibold text-emerald-700">Stable</span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">Next steps</p>
              <ul className="mt-2 space-y-2">
                <li>• Invite managers to review this team weekly.</li>
                <li>• Share manager playbooks to address stress themes.</li>
                <li>• Schedule your next pulse cadence.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
