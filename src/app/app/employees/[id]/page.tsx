import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anonymize, updateEmployeeRole, updateEmployeeTeams } from "./actions";
import { getRoleLabel } from "@/lib/roles";
import { getLocale } from "@/lib/i18n-server";

type Props = {
  params: { id: string };
  searchParams?: { email?: string };
};

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params, searchParams }: Props) {
  const locale = await getLocale();
  const resolvedParams = await Promise.resolve(params);
  const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id;
  const employeeId = typeof rawId === "string" ? decodeURIComponent(rawId).trim() : "";
  if (!employeeId) {
    notFound();
  }
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const rawEmail = resolvedSearchParams?.email;
  const employeeEmail = typeof rawEmail === "string" ? decodeURIComponent(rawEmail).trim().toLowerCase() : "";
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role)) redirect("/signin");

  const include = { userTeams: { include: { team: true } } };
  let employee = await prisma.user.findUnique({
    where: { id: employeeId, organizationId: user.organizationId },
    include,
  });
  if (!employee) {
    const member = await prisma.member.findFirst({
      where: { id: employeeId, organizationId: user.organizationId },
      select: { userId: true },
    });
    if (member?.userId) {
      employee = await prisma.user.findUnique({
        where: { id: member.userId, organizationId: user.organizationId },
        include,
      });
    }
  }
  if (!employee && employeeEmail) {
    employee = await prisma.user.findUnique({
      where: { email: employeeEmail, organizationId: user.organizationId },
      include,
    });
  }
  if (!employee) {
    notFound();
  }
  if ((employee.role ?? "").toUpperCase() === "SUPER_ADMIN") notFound();
  const teamNames =
    employee.userTeams?.map((entry: any) => entry.team?.name).filter(Boolean).join(", ") || "—";
  const canEditTeams = ["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role);
  const canAnonymize = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  const canEditRole = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  const employeeRole = (employee.role ?? "").toUpperCase();
  const isAdminRole = ["ADMIN", "HR", "SUPER_ADMIN"].includes(employeeRole);
  const allTeams = canEditTeams
    ? await prisma.team.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];
  const selectedTeamIds = new Set(employee.userTeams?.map((entry: any) => entry.teamId).filter(Boolean));
  const isSelf =
    employee.id === user.id ||
    (employee.email && user.email && employee.email.toLowerCase() === user.email.toLowerCase());
  const publicId = toPublicId(employee.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Employee</p>
          <h1 className="text-2xl font-semibold text-slate-900">{employee.name}</h1>
          <p className="text-sm text-slate-600">{employee.email}</p>
        </div>
        <div className="flex gap-2">
          {canAnonymize &&
            (!isSelf ? (
              <form action={anonymize}>
                <input type="hidden" name="userId" value={employee.id} />
                <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                  Delete / anonymize user
                </button>
              </form>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500">
                You can&apos;t remove yourself
              </span>
            ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <Info label="Role" value={getRoleLabel(employee.role, locale)} />
          <Info label="Teams" value={teamNames} />
          <Info label="Created" value={new Date(employee.createdAt).toLocaleDateString()} />
          <Info label="User ID" value={publicId} />
        </dl>
      </div>

      {canEditRole && !isAdminRole && !isSelf && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Role access</h3>
          <p className="mt-1 text-sm text-slate-600">Change this employee's role in your workspace.</p>
          <form action={updateEmployeeRole} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="userId" value={employee.id} />
            <select
              name="role"
              defaultValue={employeeRole === "MANAGER" ? "MANAGER" : "EMPLOYEE"}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              <option value="EMPLOYEE">{getRoleLabel("EMPLOYEE", locale)}</option>
              <option value="MANAGER">{getRoleLabel("MANAGER", locale)}</option>
            </select>
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong"
            >
              Save role
            </button>
          </form>
        </div>
      )}

      {canEditTeams && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Team membership</h3>
          <p className="mt-1 text-sm text-slate-600">Assign this employee to teams in your workspace.</p>
          <form action={updateEmployeeTeams} className="mt-4 space-y-4">
            <input type="hidden" name="userId" value={employee.id} />
            {allTeams.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allTeams.map((team) => (
                  <label
                    key={team.id}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="teamIds"
                      value={team.id}
                      defaultChecked={selectedTeamIds.has(team.id)}
                      className="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    <span className="font-semibold text-slate-800">{team.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No teams yet. Create a team first.</p>
            )}
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong"
            >
              Save teams
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function toPublicId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 999999) + 1;
  return String(num).padStart(6, "0");
}
