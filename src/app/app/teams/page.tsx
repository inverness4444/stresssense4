import Link from "next/link";
import { AccessDenied } from "@/components/app/AccessDenied";
import { CreateTeamModal } from "@/components/app/CreateTeamModal";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeamsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in to view teams.</p>
      </div>
    );
  }
  if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Teams</h2>
          <p className="text-sm text-slate-600">Organize your workspace into teams so stress insights stay relevant and actionable.</p>
        </div>
        <AccessDenied />
      </div>
    );
  }

  const [teams, users, myTeams] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: currentUser.organizationId },
      include: {
        users: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: currentUser.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.userTeam.findMany({ where: { userId: currentUser.id } }),
  ]);

  const isAdmin = currentUser.role === "ADMIN";
  const visibleTeams = isAdmin ? teams : teams.filter((t: any) => myTeams.some((mt: any) => mt.teamId === t.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Teams</h2>
          <p className="text-sm text-slate-600">
            Organize your workspace into teams so stress insights stay relevant and actionable.
          </p>
        </div>
        {isAdmin && <CreateTeamModal users={users} />}
      </div>

      {!isAdmin && visibleTeams.length === 0 && (
        <AccessDenied />
      )}

      {visibleTeams.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-700">
          No teams yet. Create your first team to start targeting stress pulses.
        </div>
      )}

      {visibleTeams.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTeams.map((team: any) => {
            const memberCount = team.users.length;
            const managers = team.users
              .filter((tu: any) => tu.user.role === "MANAGER")
              .map((tu: any) => tu.user.name);

            return (
              <div
                key={team.id}
                className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {memberCount} member{memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {team.description && (
                    <p className="text-sm text-slate-600">{team.description}</p>
                  )}
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>
                      Managers:{" "}
                      {managers.length ? managers.join(", ") : "None yet"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {team.users.slice(0, 3).map((tu: any) => (
                      <span
                        key={tu.userId}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                        title={tu.user.email}
                      >
                        {tu.user.name.charAt(0)}
                      </span>
                    ))}
                    {memberCount > 3 && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        +{memberCount - 3}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-700 ring-1 ring-emerald-100">
                    Active
                  </span>
                  <Link
                    href={`/app/teams/${team.id}`}
                    className="text-sm font-semibold text-primary transition hover:underline"
                  >
                    View team
                  </Link>
                </div>
              </div>
            );
          })}
          {teams.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No teams yet. Create your first team to group employees.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
