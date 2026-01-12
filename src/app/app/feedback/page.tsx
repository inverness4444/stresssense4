import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { AccessDenied } from "@/components/app/AccessDenied";
import { PageTitle } from "@/components/ui/PageTitle";
import SendAnonymousFeedbackClient from "./SendAnonymousFeedbackClient";
import { ANON_CATEGORIES, MIN_TEAM_SIZE_FOR_ANON, isAdminLikeRole } from "@/lib/anonymousFeedback";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const locale = await getLocale();
  const role = (user.role ?? "").toUpperCase();
  const canSend = ["EMPLOYEE", "MANAGER", "ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  if (!canSend) {
    return (
      <div className="space-y-4">
        <PageTitle title={t(locale, "feedbackSendTitle")} subtitle={t(locale, "feedbackSendSubtitle")} />
        <AccessDenied />
      </div>
    );
  }

  const isAdminSender = isAdminLikeRole(role);
  const memberships = isAdminSender
    ? []
    : await prisma.userTeam.findMany({
        where: { userId: user.id },
        include: { team: { select: { id: true, name: true } } },
      });
  const teamsBase = isAdminSender
    ? await prisma.team.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true, name: true, memberCount: true },
        orderBy: { name: "asc" },
      })
    : memberships.map((entry) => ({ id: entry.team.id, name: entry.team.name, memberCount: null }));
  const teamIds = teamsBase.map((entry) => entry.id);

  const [counts, teamMeta] = teamIds.length
    ? await Promise.all([
        prisma.userTeam.groupBy({
          by: ["teamId"],
          where: { teamId: { in: teamIds } },
          _count: { teamId: true },
        }),
        prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, memberCount: true },
        }),
      ])
    : [[], []];
  const countByTeam = counts.reduce<Record<string, number>>((acc, row: any) => {
    acc[row.teamId] = row._count.teamId;
    return acc;
  }, {});
  const teamCountById = teamMeta.reduce<Record<string, number>>((acc, team: any) => {
    if (typeof team.memberCount === "number") acc[team.id] = team.memberCount;
    return acc;
  }, {});

  const recipientEntries = teamIds.length
    ? await prisma.userTeam.findMany({
        where: {
          teamId: { in: teamIds },
        },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];
  const recipientsByTeam = recipientEntries.reduce<Record<string, { id: string; name: string }[]>>((acc, entry: any) => {
    if (!acc[entry.teamId]) acc[entry.teamId] = [];
    if (entry.user?.id && entry.user?.name && entry.user.id !== user.id) {
      acc[entry.teamId].push({ id: entry.user.id, name: entry.user.name });
    }
    return acc;
  }, {});

  const teams = teamsBase.map((entry) => ({
    id: entry.id,
    name: entry.name,
    size: teamCountById[entry.id] ?? countByTeam[entry.id] ?? 0,
    recipients: recipientsByTeam[entry.id] ?? [],
  }));

  const admins = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      role: { in: ["ADMIN", "HR", "SUPER_ADMIN"] },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  const adminRecipients = admins.filter((admin) => admin.id !== user.id);

  const categoryLabels: Record<string, string> = {
    communication: t(locale, "feedbackCategoryCommunication"),
    workload: t(locale, "feedbackCategoryWorkload"),
    process: t(locale, "feedbackCategoryProcess"),
    culture: t(locale, "feedbackCategoryCulture"),
    conflict: t(locale, "feedbackCategoryConflict"),
    ideas: t(locale, "feedbackCategoryIdeas"),
  };
  const categories = ANON_CATEGORIES.map((category) => ({
    id: category,
    label: categoryLabels[category] ?? category,
  }));

  return (
    <div className="space-y-6">
      <PageTitle title={t(locale, "feedbackSendTitle")} subtitle={t(locale, "feedbackSendSubtitle")} />
      <SendAnonymousFeedbackClient
        locale={locale}
        teams={teams}
        admins={adminRecipients}
        categories={categories}
        minTeamSize={MIN_TEAM_SIZE_FOR_ANON}
      />
    </div>
  );
}
