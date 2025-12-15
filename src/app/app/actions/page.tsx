import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ActionCenterClient } from "@/components/app/ActionCenterClient";
import { seedDemoNudgesForTeams } from "@/lib/nudgesStore";

export default async function ActionsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!["HR", "Manager"].includes(user.role)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">You don&apos;t have access to this area.</p>
      </div>
    );
  }

  const teams =
    user.role === "ADMIN"
      ? await prisma.team.findMany({ where: { organizationId: user.organizationId } })
      : await prisma.member
          .findMany({ where: { userId: user.id }, include: { team: true } })
          .then((rows: any[]) => rows.map((r: any) => r.team));

  // Seed demo nudges if none exist
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

  const defaultTeamId = typeof searchParams?.team === "string" ? searchParams.team : undefined;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <ActionCenterClient teams={teams.map((t: any) => ({ id: t.id, name: t.name }))} defaultTeamId={defaultTeamId} />
    </div>
  );
}
