import { AccessDenied } from "@/components/app/AccessDenied";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_ROLES } from "@/lib/roles";
import { t, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createJoinInvite } from "@/lib/joinInvites";
import { InviteLinkBlock } from "@/app/app/settings/InviteLinkBlock";
import { getBillingOverview } from "@/lib/billingOverview";
import { MIN_SEATS } from "@/config/pricing";
import Link from "next/link";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url";

type Props = {
  searchParams?: {
    q?: string;
    role?: string;
  };
};

export const dynamic = "force-dynamic";

export default async function EmployeesPage({ searchParams }: Props) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const currentUser = await getCurrentUser();
  const locale = await getLocale();
  const isRu = locale === "ru";
  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">{t(locale, "employeesSigninPrompt")}</p>
      </div>
    );
  }
  const role = (currentUser.role ?? "").toUpperCase();
  const canViewEmployees = ["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role);
  const canManageEmployees = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  const canEditEmployeeTeams = ["ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(role);
  if (!canViewEmployees) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">{t(locale, "employeesTitle")}</h2>
          <p className="text-sm text-slate-600">{t(locale, "employeesSubtitle")}</p>
        </div>
        <AccessDenied />
      </div>
    );
  }

  const query = (resolvedSearchParams?.q ?? "").trim();
  const roleFilterRaw = (resolvedSearchParams?.role ?? "all").toUpperCase();
  const allowedRoles = new Set([...USER_ROLES, "HR", "SUPER_ADMIN"]);
  const roleFilter = allowedRoles.has(roleFilterRaw) ? roleFilterRaw : null;

  const org = await prisma.organization.findUnique({ where: { id: currentUser.organizationId } });
  let inviteToken = "";
  if (canManageEmployees && org) {
    try {
      const invite = await createJoinInvite({
        organizationId: currentUser.organizationId,
        role: "EMPLOYEE",
        createdByUserId: currentUser.id,
      });
      inviteToken = invite?.token ?? "";
    } catch {
      inviteToken = "";
    }
  }
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const forwardedProto = (headerList.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "")
    : getBaseUrl();

  const hiddenRole = "SUPER_ADMIN";
  const where = {
    organizationId: currentUser.organizationId,
    AND: [
      { role: { not: hiddenRole } },
      ...(roleFilter ? [{ role: roleFilter }] : []),
    ],
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const billing = await getBillingOverview(currentUser.organizationId, currentUser.id);
  const seatsConfigured = typeof billing.seatsConfigured === "number" ? billing.seatsConfigured : MIN_SEATS;
  const seatsUsed = typeof billing.seatsUsed === "number" ? billing.seatsUsed : users.length;
  const seatsOverLimit = seatsUsed > seatsConfigured;

  const userIds = users.map((user) => user.id);
  type UserTeamRow = { userId: string; team: { id: string; name: string } };
  const userTeamsPromise: Promise<UserTeamRow[]> = userIds.length
    ? prisma.userTeam.findMany({
        where: { userId: { in: userIds } },
        include: { team: true },
      })
    : Promise.resolve([]);
  const userTeams = await userTeamsPromise;
  const teamsByUserId = userTeams.reduce<Record<string, { id: string; name: string }[]>>((acc, entry: any) => {
    if (!acc[entry.userId]) acc[entry.userId] = [];
    acc[entry.userId].push(entry.team);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">{t(locale, "employeesTitle")}</h2>
        <p className="text-sm text-slate-600">
          {t(locale, "employeesSubtitle")}
        </p>
      </div>

      {org && canManageEmployees && (
        <InviteLinkBlock
          slug={org.slug ?? ""}
          organizationId={org.id}
          inviteToken={inviteToken}
          canRegenerate={canManageEmployees}
          baseUrl={baseUrl}
        />
      )}

      {seatsOverLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {isRu
                ? `Используется ${seatsUsed} мест при лимите ${seatsConfigured}. Увеличьте количество мест.`
                : `You are using ${seatsUsed} seats with ${seatsConfigured} configured. Increase seats.`}
            </span>
            <Link
              href="/app/settings/billing"
              className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              {isRu ? "Увеличить места" : "Increase seats"}
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex w-full max-w-xl items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-auto">
          <input
            name="q"
            defaultValue={query}
            placeholder={t(locale, "employeesSearchPlaceholder")}
            className="w-full rounded-full px-2 text-sm text-slate-800 outline-none"
          />
          <select
            name="role"
            defaultValue={roleFilter ?? "all"}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase text-slate-700 outline-none transition hover:border-primary/30"
          >
            <option value="all">{t(locale, "employeesFilterAllRoles")}</option>
            <option value="ADMIN">{t(locale, "employeesFilterAdmins")}</option>
            <option value="MANAGER">{t(locale, "employeesFilterManagers")}</option>
            <option value="EMPLOYEE">{t(locale, "employeesFilterEmployees")}</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90"
          >
            {t(locale, "employeesFilterButton")}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {[t(locale, "employeesTableName"), t(locale, "employeesTableRole"), t(locale, "employeesTableTeams"), t(locale, "employeesTableStatus"), t(locale, "employeesTableActions")].map((header) => (
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
            {users.map((employee: any) => (
              <tr
                key={employee.id}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                      <p className="text-xs text-slate-500">{employee.email}</p>
                      {employee.slackUserId && <p className="text-[11px] text-slate-500">Slack: {employee.slackUserId}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RoleBadge locale={locale} role={String(employee.role ?? "")} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(teamsByUserId[employee.id] ?? []).length === 0 && (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                    {(teamsByUserId[employee.id] ?? []).map((team) => (
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
                  <StatusBadge locale={locale} createdAt={employee.createdAt} updatedAt={employee.updatedAt} />
                </td>
                <td className="px-4 py-3">
                  {canEditEmployeeTeams ? (
                    employee.id === currentUser.id ||
                    (employee.email && currentUser.email && employee.email.toLowerCase() === currentUser.email.toLowerCase()) ? (
                      <span className="text-sm font-semibold text-slate-400">{isRu ? "Это вы" : "This is you"}</span>
                    ) : (
                      <a
                        href={`/app/employees/${employee.id}?email=${encodeURIComponent(employee.email)}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {t(locale, "employeesActionManage")}
                      </a>
                    )
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-slate-600"
                >
                  {t(locale, "employeesEmptyState")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role, locale }: { role: string; locale: Locale }) {
  const colors: Record<string, string> = {
    ADMIN: "bg-rose-50 text-rose-700 ring-rose-100",
    HR: "bg-rose-50 text-rose-700 ring-rose-100",
    SUPER_ADMIN: "bg-rose-50 text-rose-700 ring-rose-100",
    MANAGER: "bg-amber-50 text-amber-700 ring-amber-100",
    EMPLOYEE: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  const normalizedRole = role.toUpperCase();
  const label =
    normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN"
      ? t(locale, "employeesRoleAdmin")
      : normalizedRole === "HR"
        ? t(locale, "employeesRoleHr")
        : normalizedRole === "MANAGER"
          ? t(locale, "employeesRoleManager")
          : t(locale, "employeesRoleEmployee");
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${colors[normalizedRole] ?? colors.EMPLOYEE}`}>
      {label}
    </span>
  );
}

function StatusBadge({ createdAt, updatedAt, locale }: { createdAt: Date; updatedAt: Date; locale: Locale }) {
  const hasJoined = updatedAt.getTime() > createdAt.getTime();
  const tone = hasJoined
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : "bg-amber-50 text-amber-700 ring-amber-100";
  const label = hasJoined ? t(locale, "employeesStatusActive") : t(locale, "employeesStatusPending");
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {label}
    </span>
  );
}
