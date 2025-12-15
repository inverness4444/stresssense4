import { AddEmployeeModal } from "@/components/app/AddEmployeeModal";
import { AccessDenied } from "@/components/app/AccessDenied";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES, type UserRole } from "@/lib/roles";

type Props = {
  searchParams?: {
    q?: string;
    role?: string;
  };
};

export default async function EmployeesPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in to view employees.</p>
      </div>
    );
  }
  if (currentUser.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Employees</h2>
          <p className="text-sm text-slate-600">Manage everyone in your StressSense workspace — roles, teams, and access.</p>
        </div>
        <AccessDenied />
      </div>
    );
  }

  const query = (searchParams?.q ?? "").trim();
  const roleFilterRaw = (searchParams?.role ?? "all").toUpperCase();
  const roleFilter = USER_ROLES.includes(roleFilterRaw as UserRole)
    ? (roleFilterRaw as UserRole)
    : null;

  const where = {
    organizationId: currentUser.organizationId,
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        teams: {
          include: { team: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({
      where: { organizationId: currentUser.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const isAdmin = currentUser.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Employees</h2>
        <p className="text-sm text-slate-600">
          Manage everyone in your StressSense workspace — roles, teams, and access.
        </p>
      </div>

      {!isAdmin && <AccessDenied />}
      {!isAdmin && (
        <div className="text-sm text-slate-600">
          You need admin access to view and manage employees.
        </div>
      )}
      {!isAdmin ? (
        <></>
      ) : (
        <>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex w-full max-w-xl items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-auto">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search name or email"
            className="w-full rounded-full px-2 text-sm text-slate-800 outline-none"
          />
          <select
            name="role"
            defaultValue={roleFilter ?? "all"}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase text-slate-700 outline-none transition hover:border-primary/30"
          >
            <option value="all">All roles</option>
            <option value="ADMIN">Admins</option>
            <option value="MANAGER">Managers</option>
            <option value="EMPLOYEE">Employees</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
            Import CSV
          </button>
          {isAdmin && <AddEmployeeModal teams={teams} />}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Role", "Teams", "Status", "Actions"].map((header) => (
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
            {users.map((user: any) => (
              <tr
                key={user.id}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {user.slackUserId && <p className="text-[11px] text-slate-500">Slack: {user.slackUserId}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role as UserRole} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {user.teams.length === 0 && (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                    {user.teams.map(({ team }: any) => (
                      <span
                        key={team.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      >
                        {team.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    Active
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-sm font-semibold text-primary hover:underline">Manage</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-600"
                >
                  No employees yet. Add your first people to start measuring stress.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const colors: Record<UserRole, string> = {
    ADMIN: "bg-rose-50 text-rose-700 ring-rose-100",
    MANAGER: "bg-amber-50 text-amber-700 ring-amber-100",
    EMPLOYEE: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${colors[role]}`}>
      {role}
    </span>
  );
}
