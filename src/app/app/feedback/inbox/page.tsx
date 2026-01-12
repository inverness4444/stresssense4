import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { AccessDenied } from "@/components/app/AccessDenied";
import { PageTitle } from "@/components/ui/PageTitle";
import { ANON_CATEGORIES } from "@/lib/anonymousFeedback";

type Props = {
  searchParams?: {
    teamId?: string;
    category?: string;
    status?: string;
  };
};

export const dynamic = "force-dynamic";

export default async function FeedbackInboxPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const locale = await getLocale();
  const role = (user.role ?? "").toUpperCase();
  const isAdmin = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  const isLeader = role === "MANAGER" || isAdmin;
  const canSend = ["EMPLOYEE", "MANAGER", "ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  if (!isLeader && !canSend) {
    return (
      <div className="space-y-4">
        <PageTitle title={t(locale, "feedbackInboxTitle")} subtitle={t(locale, "feedbackInboxSubtitle")} />
        <AccessDenied />
      </div>
    );
  }

  if (!isLeader) {
    const threads = (await prisma.anonymousThread.findMany({
      where: {
        feedback: { orgId: user.organizationId, senderUserId: user.id },
      },
      include: {
        feedback: { select: { category: true, status: true, createdAt: true, team: { select: { id: true, name: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    })) ?? [];

    const categoryLabels: Record<string, string> = {
      communication: t(locale, "feedbackCategoryCommunication"),
      workload: t(locale, "feedbackCategoryWorkload"),
      process: t(locale, "feedbackCategoryProcess"),
      culture: t(locale, "feedbackCategoryCulture"),
      conflict: t(locale, "feedbackCategoryConflict"),
      ideas: t(locale, "feedbackCategoryIdeas"),
    };
    const statusLabels: Record<string, string> = {
      new: t(locale, "feedbackStatusNew"),
      in_progress: t(locale, "feedbackStatusInProgress"),
      resolved: t(locale, "feedbackStatusResolved"),
    };
    const statusStyles: Record<string, string> = {
      new: "bg-amber-50 text-amber-700 ring-amber-200",
      in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
      resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };

    return (
      <div className="space-y-6">
        <PageTitle title={t(locale, "feedbackMyInboxTitle")} subtitle={t(locale, "feedbackMyInboxSubtitle")} />

        <div className="space-y-3">
          {threads.map((thread) => {
            const lastMessage = thread.messages?.[0]?.body ?? thread.feedback.message ?? "";
            const dateSource = thread.messages?.[0]?.createdAt ?? thread.feedback.createdAt;
            const createdAt = dateSource
              ? new Date(dateSource).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")
              : "—";
            const statusLabel = statusLabels[thread.feedback.status] ?? thread.feedback.status;
            return (
              <div key={thread.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {categoryLabels[thread.feedback.category] ?? thread.feedback.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {thread.feedback.team?.name ?? "—"} · {createdAt}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[thread.feedback.status] ?? statusStyles.new}`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{lastMessage}</p>
                <Link
                  href={`/app/feedback/thread/${thread.id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
                >
                  {t(locale, "feedbackViewThread")}
                </Link>
              </div>
            );
          })}
          {threads.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              {t(locale, "feedbackEmpty")}
            </div>
          )}
        </div>
      </div>
    );
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const teamId = resolvedSearchParams?.teamId ?? "";
  const category = resolvedSearchParams?.category ?? "";
  const status = resolvedSearchParams?.status ?? "";

  const where: any = { orgId: user.organizationId };
  if (!isAdmin) where.recipientLeaderId = user.id;
  if (teamId) where.teamId = teamId;
  if (category) where.category = category;
  if (status) where.status = status;

  const feedback = (await prisma.anonymousFeedback.findMany({
    where,
    select: {
      id: true,
      category: true,
      status: true,
      message: true,
      createdAt: true,
      team: { select: { id: true, name: true } },
      thread: { select: { id: true, anonHandle: true } },
    },
    orderBy: { createdAt: "desc" },
  })) ?? [];

  const teams = (await prisma.team.findMany({
    where: { organizationId: user.organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })) ?? [];

  const categoryLabels: Record<string, string> = {
    communication: t(locale, "feedbackCategoryCommunication"),
    workload: t(locale, "feedbackCategoryWorkload"),
    process: t(locale, "feedbackCategoryProcess"),
    culture: t(locale, "feedbackCategoryCulture"),
    conflict: t(locale, "feedbackCategoryConflict"),
    ideas: t(locale, "feedbackCategoryIdeas"),
  };

  const statusLabels: Record<string, string> = {
    new: t(locale, "feedbackStatusNew"),
    in_progress: t(locale, "feedbackStatusInProgress"),
    resolved: t(locale, "feedbackStatusResolved"),
  };

  const statusStyles: Record<string, string> = {
    new: "bg-amber-50 text-amber-700 ring-amber-200",
    in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <div className="space-y-6">
      <PageTitle title={t(locale, "feedbackInboxTitle")} subtitle={t(locale, "feedbackInboxSubtitle")} />

      <form className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <select
          name="teamId"
          defaultValue={teamId}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <option value="">{t(locale, "feedbackFilterAll")}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <option value="">{t(locale, "feedbackFilterAll")}</option>
          {ANON_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {categoryLabels[item] ?? item}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <option value="">{t(locale, "feedbackFilterAll")}</option>
          {Object.keys(statusLabels).map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          {t(locale, "employeesFilterButton")}
        </button>
      </form>

      <div className="space-y-3">
        {feedback.map((item) => {
          const preview = item.message ? item.message.slice(0, 140) : "";
          const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US") : "—";
          const statusLabel = statusLabels[item.status] ?? item.status;
          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {categoryLabels[item.category] ?? item.category}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.team?.name ?? "—"} · {createdAt}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[item.status] ?? statusStyles.new}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{preview}</p>
              {item.thread?.id && (
                <Link
                  href={`/app/feedback/thread/${item.thread.id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
                >
                  {t(locale, "feedbackViewThread")}
                </Link>
              )}
            </div>
          );
        })}
        {feedback.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            {t(locale, "feedbackEmpty")}
          </div>
        )}
      </div>
    </div>
  );
}
