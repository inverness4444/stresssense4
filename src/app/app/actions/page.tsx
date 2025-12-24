import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ActionCenterClient } from "@/components/app/ActionCenterClient";
import { seedDemoNudgesForTeams } from "@/lib/nudgesStore";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function ActionsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const role = (user.role ?? "").toUpperCase();
  const locale = await getLocale();
  if (!["HR", "MANAGER", "ADMIN"].includes(role)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">{t(locale, "accessDeniedBody")}</p>
      </div>
    );
  }

  let teams =
    role === "ADMIN"
      ? await prisma.team.findMany({ where: { organizationId: user.organizationId } })
      : await prisma.member
          .findMany({ where: { userId: user.id }, include: { team: true } })
          .then((rows: any[] | null | undefined) => (Array.isArray(rows) ? rows.map((r: any) => r?.team).filter(Boolean) : []));

  // Fallback: if manager has no direct memberships yet, show org teams to avoid empty/null state
  if (teams.length === 0) {
    teams = await prisma.team.findMany({ where: { organizationId: user.organizationId } });
  }

  const isDemo = Boolean((user as any)?.organization?.isDemo);

  // Seed demo nudges only for demo workspaces
  if (isDemo) {
    seedDemoNudgesForTeams(
      teams.map((t: any) => ({
        id: t.id,
        orgId: user.organizationId,
        name: t.name,
        stressIndex: 6,
        engagementScore: 6.5,
        participation: 70,
        memberCount: 0,
        status: "Watch",
        topTags: [],
      })) as any[]
    );
  }

  const defaultTeamId = typeof searchParams?.team === "string" ? searchParams.team : undefined;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <ActionCenterClient locale={locale} teams={teams.map((t: any) => ({ id: t.id, name: t.name }))} defaultTeamId={defaultTeamId} isDemo={isDemo} />
    </div>
  );
}
