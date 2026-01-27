import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SurveyReportWithAiPanel } from "@/components/app/SurveyReportWithAiPanel";
import { StressDriversGrid } from "@/components/app/StressDriversGrid";
import { getLocale } from "@/lib/i18n-server";
import { initialActions, type ActionItem } from "@/lib/actionCenterMocks";
import { getTeamActionsByStatus, getTeamStatus, teamStatusMeta } from "@/lib/statusLogic";
import { getStressDrivers } from "@/lib/aiStressDrivers";
import { computeStatsForResponses, getPeriodRanges } from "@/lib/ai/analysisAggregates";
import { OverviewReportSelector } from "./OverviewReportSelector";
import { getDisplayStressIndex, getEngagementFromParticipation } from "@/lib/metricDisplay";
import { getBillingGateStatus } from "@/lib/billingGate";
import { env } from "@/config/env";

type OverviewSearchParams = {
  team?: string | string[];
  teamId?: string | string[];
  scope?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

type OverviewPageProps = {
  searchParams?: OverviewSearchParams | Promise<OverviewSearchParams>;
};

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const role = (user.role ?? "").toUpperCase();
  if (role === "EMPLOYEE") redirect("/app/my/home");
  const locale = await getLocale();
  const isRu = locale === "ru";
  const isDemo = Boolean((user as any)?.organization?.isDemo);
  const createdAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : new Date();
  const diffDays = Math.max(0, Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - createdAt.getTime())) / (24 * 60 * 60 * 1000)));
  const gateAdvanced = !isDemo && diffDays > 0;
  const gateStatus = await getBillingGateStatus(user.organizationId, createdAt, { userRole: user.role });
  const aiEnabled = gateStatus.hasPaidAccess || env.isDev;

  const teams = await prisma.team.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } });
  const runs = (await prisma.surveyRun.findMany({ where: { orgId: user.organizationId }, orderBy: { launchedAt: "desc" }, take: 5 })) ?? [];
  const nudges = await prisma.nudgeInstance.findMany({
    where: { orgId: user.organizationId, status: { in: ["todo", "planned"] } },
    include: { template: true, team: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const sampleTeams: any[] = [
    { id: "sample-1", name: "Product", stressIndex: 7.0, engagementScore: 7.2, participation: 80, status: "Watch" },
    { id: "sample-2", name: "Marketing", stressIndex: 7.0, engagementScore: 7.0, participation: 80, status: "UnderPressure" },
  ];
  const safeTeams = isDemo ? (teams.length ? teams : sampleTeams) : teams;
  const safeRuns =
    isDemo && runs.length === 0
      ? [{ id: "sample-run", title: "Stress & Engagement pulse", launchedAt: new Date(), avgStressIndex: 6.5, avgEngagementScore: 7.1 }]
      : runs;
  const safeNudges =
    isDemo && (nudges ?? []).length === 0
      ? [
          {
            id: "sample-nudge-1",
            template: { title: "Провести ревизию митингов", description: "Сократите повторяющиеся встречи и освободите фокус.", triggerTags: ["meetings"] },
            status: "todo",
            team: { name: "Product" },
            tags: ["meetings"],
          },
          {
            id: "sample-nudge-2",
            template: { title: "Перераспределить задачи", description: "Сдвиньте задачи, чтобы снизить нагрузку.", triggerTags: ["workload", "clarity"] },
            status: "planned",
            team: { name: "Marketing" },
            tags: ["workload", "clarity"],
          },
        ]
      : nudges;

  const isAdminLike = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  const membershipTeams = !isDemo && !isAdminLike
    ? await prisma.userTeam.findMany({ where: { userId: user.id }, select: { teamId: true } })
    : [];
  const allowedTeamIds = new Set(membershipTeams.map((t) => t.teamId));
  const accessibleTeams = isDemo || isAdminLike
    ? safeTeams
    : safeTeams.filter((team: any) => allowedTeamIds.has(team.id));
  const accessibleTeamIds = accessibleTeams.map((team: any) => team.id);

  const hasTeams = accessibleTeams.length > 0;
  const hasOverallRuns = safeRuns.length > 0;

  const stressValues = hasTeams
    ? accessibleTeams
        .map((t: any) => getDisplayStressIndex(t.stressIndex, t.engagementScore))
        .filter((v: number | null) => v != null) as number[]
    : [];
  const engagementValues = hasTeams
    ? accessibleTeams
        .map((t: any) => getEngagementFromParticipation(t.participation, t.engagementScore))
        .filter((v: number | null) => v != null) as number[]
    : [];
  const avgStressRaw = stressValues.length ? stressValues.reduce((acc, v) => acc + v, 0) / stressValues.length : 0;
  const avgEngagementRaw = engagementValues.length ? engagementValues.reduce((acc, v) => acc + v, 0) / engagementValues.length : 0;
  const participationRaw = hasTeams
    ? Math.round(accessibleTeams.reduce((acc: number, t: any) => acc + (t.participation ?? 0), 0) / accessibleTeams.length)
    : 0;
  let avgEngagement = avgEngagementRaw;
  const participation = participationRaw;

  const cookieStore = await cookies();
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const rawScopeParam = Array.isArray(resolvedSearchParams?.scope) ? resolvedSearchParams?.scope[0] : resolvedSearchParams?.scope;
  const rawTeamParam = Array.isArray(resolvedSearchParams?.teamId) ? resolvedSearchParams?.teamId[0] : resolvedSearchParams?.teamId;
  const rawLegacyTeamParam = Array.isArray(resolvedSearchParams?.team) ? resolvedSearchParams?.team[0] : resolvedSearchParams?.team;
  const rawTeamCookie = cookieStore.get("ss_overview_team")?.value;
  const resolveTeamValue = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  };
  const scopeParam = resolveTeamValue(rawScopeParam);
  const teamParam = resolveTeamValue(rawTeamParam) ?? resolveTeamValue(rawLegacyTeamParam);
  const cookieTeam = resolveTeamValue(rawTeamCookie);
  const hasTeamAccess = (id?: string | null) => Boolean(id && accessibleTeams.some((team: any) => team.id === id));
  const fallbackTeamId = accessibleTeams[0]?.id ?? null;

  let selectedScope: "org" | "team" = "org";
  let selectedTeamId: string | null = null;

  if (scopeParam === "team" && hasTeamAccess(teamParam)) {
    selectedScope = "team";
    selectedTeamId = teamParam!;
  } else if (scopeParam === "org" && isAdminLike) {
    selectedScope = "org";
    selectedTeamId = null;
  } else if (!isAdminLike) {
    const preferredTeam = hasTeamAccess(teamParam)
      ? teamParam
      : hasTeamAccess(cookieTeam)
        ? cookieTeam
        : fallbackTeamId;
    selectedScope = "team";
    selectedTeamId = preferredTeam ?? null;
  } else {
    const preferredTeam = hasTeamAccess(teamParam)
      ? teamParam
      : hasTeamAccess(cookieTeam)
        ? cookieTeam
        : null;
    if (preferredTeam) {
      selectedScope = "team";
      selectedTeamId = preferredTeam;
    } else {
      selectedScope = "org";
      selectedTeamId = null;
    }
  }

  const showTeamReport = selectedScope === "team" && Boolean(selectedTeamId);
  const teamIdForFilter = showTeamReport ? selectedTeamId : null;
  const teamOptions = accessibleTeams.map((team: any) => ({ id: team.id, name: team.name }));
  const selectedTeam = teamIdForFilter ? accessibleTeams.find((team: any) => team.id === teamIdForFilter) ?? null : null;
  const reportTeam = showTeamReport ? selectedTeam ?? null : accessibleTeams[0] ?? null;
  const teamMemberCount = teamIdForFilter
    ? await prisma.member.count({
        where: { teamId: teamIdForFilter, organizationId: user.organizationId },
      })
    : 0;
  const teamHasMembers = teamMemberCount > 0;
  const selectorLabels = {
    title: isRu ? "Отчет" : "Report view",
    all: isRu ? "Общий обзор всех команд" : "All teams overview",
    teamPrefix: isRu ? "Отчет: " : "Report: ",
  };
  const overallHistoryRaw = await prisma.teamMetricsHistory.findMany({
    where: {
      team: { organizationId: user.organizationId },
      ...(isDemo || isAdminLike ? {} : { teamId: { in: accessibleTeamIds } }),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const overallHistory = overallHistoryRaw.slice().reverse();
  const teamRunsRaw =
    teamIdForFilter
      ? await prisma.surveyRun.findMany({
          where: { orgId: user.organizationId, teamId: teamIdForFilter },
          orderBy: { launchedAt: "desc" },
          take: 5,
        })
      : [];
  const teamHistoryRaw =
    teamIdForFilter
      ? await prisma.teamMetricsHistory.findMany({
          where: { teamId: teamIdForFilter },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : [];
  const teamHistory = teamHistoryRaw.slice().reverse();
  const teamRuns = teamRunsRaw;
  const teamRunsWithStats = teamRuns.filter((run: any) => run.avgStressIndex != null || run.avgEngagementScore != null);
  const hasTeamRuns = teamRunsWithStats.length > 0;
  const analysisLocale = locale === "ru" ? "ru" : "en";
  const responseInclude = { run: { include: { template: { include: { questions: true } } } } };
  const overallResponseWhere = {
    run: { orgId: user.organizationId },
    OR: isDemo || isAdminLike
      ? [
          { member: { organizationId: user.organizationId } },
          { run: { teamId: { not: null } } },
        ]
      : [
          { run: { teamId: { in: accessibleTeamIds } } },
          { member: { teamId: { in: accessibleTeamIds }, organizationId: user.organizationId } },
        ],
  };
  const teamResponseWhere =
    teamIdForFilter
      ? {
          run: { orgId: user.organizationId },
          OR: [
            { run: { teamId: teamIdForFilter } },
            { member: { teamId: teamIdForFilter, organizationId: user.organizationId } },
          ],
        }
      : null;
  const overallLatestResponse = await prisma.surveyResponse.findFirst({
    where: overallResponseWhere,
    orderBy: { submittedAt: "desc" },
    select: { submittedAt: true },
  });
  const overallRange = getPeriodRanges("year", overallLatestResponse?.submittedAt ?? new Date()).current;
  const overallResponses = await prisma.surveyResponse.findMany({
    where: { ...overallResponseWhere, submittedAt: { gte: overallRange.start, lte: overallRange.end } },
    include: responseInclude,
    orderBy: { submittedAt: "asc" },
  });
  const overallStats = computeStatsForResponses(overallResponses, analysisLocale, overallRange);
  const overallTrendSource =
    overallStats.overallTrend.length > 0
      ? overallStats.overallTrend
      : overallStats.stressTrend.length > 0
        ? overallStats.stressTrend
        : overallStats.engagementTrend;
  const overallResponseSeries = overallTrendSource.map((point) => ({
    label: point.label,
    value: point.value,
    date: point.date,
  }));

  const teamLatestResponse =
    teamIdForFilter
      ? await prisma.surveyResponse.findFirst({
          where: teamResponseWhere ?? { run: { orgId: user.organizationId, teamId: teamIdForFilter } },
          orderBy: { submittedAt: "desc" },
          select: { submittedAt: true },
        })
      : null;
  const teamRange = teamIdForFilter
    ? getPeriodRanges("year", teamLatestResponse?.submittedAt ?? new Date()).current
    : null;
  const teamResponses =
    teamIdForFilter
      ? await prisma.surveyResponse.findMany({
          where: {
            ...(teamResponseWhere ?? { run: { orgId: user.organizationId, teamId: teamIdForFilter } }),
            submittedAt: { gte: teamRange!.start, lte: teamRange!.end },
          },
          include: responseInclude,
          orderBy: { submittedAt: "asc" },
        })
      : [];
  const teamStats = showTeamReport && teamRange ? computeStatsForResponses(teamResponses, analysisLocale, teamRange) : null;
  const teamTrendSource = teamStats
    ? (teamStats.overallTrend.length > 0
        ? teamStats.overallTrend
        : teamStats.stressTrend.length > 0
          ? teamStats.stressTrend
          : teamStats.engagementTrend)
    : [];
  const teamResponseSeries = teamStats
    ? teamTrendSource.map((point) => ({ label: point.label, value: point.value, date: point.date }))
    : [];
  const overallStressAvg =
    overallStats.overallCount > 0
      ? overallStats.overallAvg
      : getDisplayStressIndex(overallStats.stressAvg, overallStats.engagementAvg) ?? overallStats.stressAvg;
  const teamStressAvg =
    teamStats && teamStats.overallCount > 0
      ? teamStats.overallAvg
      : teamStats
        ? (getDisplayStressIndex(teamStats.stressAvg, teamStats.engagementAvg) ?? teamStats.stressAvg)
        : null;
  const avgStress = overallStats.overallCount > 0 ? overallStressAvg : avgStressRaw;
  if (overallStats.engagementCount > 0) {
    avgEngagement = overallStats.engagementAvg;
  }
  const overallStatus = hasTeams ? getTeamStatus(avgStress, avgEngagement, participation) : null;
  const overallMeta = overallStatus ? teamStatusMeta[overallStatus] : null;

  const overallStressScore =
    overallStats.overallCount > 0
      ? overallStressAvg
      : safeRuns.length > 0
        ? getDisplayStressIndex(safeRuns[0].avgStressIndex, safeRuns[0].avgEngagementScore) ?? avgStressRaw
        : avgStressRaw;
  const teamStressScore =
    teamStats && teamStats.overallCount > 0 && teamStressAvg != null
      ? teamStressAvg
      : teamRunsWithStats.length > 0
        ? getDisplayStressIndex(teamRunsWithStats[0].avgStressIndex, teamRunsWithStats[0].avgEngagementScore) ??
          (getDisplayStressIndex(reportTeam?.stressIndex, reportTeam?.engagementScore) ?? 0)
        : getDisplayStressIndex(reportTeam?.stressIndex, reportTeam?.engagementScore) ?? 0;
  const reportScoreRaw = showTeamReport ? teamStressScore : overallStressScore;

  const formatLabel = (date: Date, idx: number) =>
    date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" }) || `W${idx + 1}`;
  const normalizeValue = (value: number) => Number.isFinite(value) ? Number(value.toFixed(1)) : 0;

  const buildTimeseriesFromRuns = (runsInput: any[], fallbackScore: number) => {
    if (runsInput.length >= 2) {
      return runsInput.map((run: any, idx: number) => ({
        label: run.launchedAt ? formatLabel(new Date(run.launchedAt), idx) : `W${idx + 1}`,
        value: normalizeValue(getDisplayStressIndex(run.avgStressIndex, run.avgEngagementScore) ?? fallbackScore),
        date: run.launchedAt ?? null,
      }));
    }
    if (runsInput.length === 1) {
      const run = runsInput[0];
      const value = normalizeValue(getDisplayStressIndex(run.avgStressIndex, run.avgEngagementScore) ?? fallbackScore);
      const currentDate = run.launchedAt ? new Date(run.launchedAt) : new Date();
      const prevDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      return [
        { label: formatLabel(prevDate, 0), value, date: prevDate },
        { label: formatLabel(currentDate, 1), value, date: currentDate },
      ];
    }
    return [];
  };

  const buildTimeseriesFromHistory = (history: any[], fallbackScore: number, aggregate: boolean) => {
    if (history.length === 0) return [];
    if (!aggregate) {
      return history.map((entry: any, idx: number) => ({
        label: entry.periodLabel ?? formatLabel(new Date(entry.createdAt), idx),
        value: normalizeValue(getDisplayStressIndex(entry.stressIndex, entry.engagementScore) ?? fallbackScore),
        date: entry.createdAt ?? null,
      }));
    }
    const buckets = new Map<string, { date: Date; sum: number; count: number }>();
    history.forEach((entry: any) => {
      const date = entry.createdAt ? new Date(entry.createdAt) : new Date();
      const key = date.toISOString().slice(0, 10);
      const current = buckets.get(key) ?? { date, sum: 0, count: 0 };
      current.sum += getDisplayStressIndex(entry.stressIndex, entry.engagementScore) ?? fallbackScore;
      current.count += 1;
      buckets.set(key, current);
    });
    return Array.from(buckets.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((bucket, idx) => ({
        label: formatLabel(bucket.date, idx),
        value: normalizeValue(bucket.sum / Math.max(1, bucket.count)),
        date: bucket.date,
      }));
  };

  const buildFlatTimeseries = (baseScore: number, points = 4) => {
    const base = normalizeValue(baseScore);
    const now = Date.now();
    return Array.from({ length: points }, (_, idx) => {
      const date = new Date(now - (points - idx - 1) * 7 * 24 * 60 * 60 * 1000);
      return {
        label: formatLabel(date, idx),
        value: base,
        date,
      };
    });
  };

  const overallRunSeries = buildTimeseriesFromRuns(safeRuns, overallStressScore);
  const overallHistorySeries = buildTimeseriesFromHistory(overallHistory, avgStress || overallStressScore, true);
  const teamRunSeries = buildTimeseriesFromRuns(teamRunsWithStats, teamStressScore);
  const teamHistorySeries = buildTimeseriesFromHistory(teamHistory, teamStressScore, false);

  const overallReportTimeseries =
    overallResponseSeries.length > 0
      ? overallResponseSeries
      : overallHistorySeries.length > 0
        ? overallHistorySeries
        : overallRunSeries.length > 0
          ? overallRunSeries
          : buildFlatTimeseries(avgStress || overallStressScore);
  const hasOverallResponses = overallStats.overallCount > 0;
  const hasTeamResponses = teamStats ? teamStats.overallCount > 0 : false;
  const teamHasData = Boolean(showTeamReport && reportTeam && teamHasMembers && hasTeamResponses);
  const teamReportTimeseries =
    teamHasData
      ? teamResponseSeries.length > 0
        ? teamResponseSeries
        : teamHistorySeries.length > 0
          ? teamHistorySeries
          : teamRunSeries.length > 0
            ? teamRunSeries
            : []
      : [];
  const reportTimeseries = showTeamReport ? teamReportTimeseries : overallReportTimeseries;
  const hasReportRuns = showTeamReport ? hasTeamRuns : hasOverallRuns;
  const hasReportHistory = showTeamReport ? teamHistory.length > 0 : overallHistory.length > 0;
  const hasReportResponses = showTeamReport ? hasTeamResponses : hasOverallResponses;
  const showSurveyNotice = showTeamReport
    ? !teamHasData
    : !hasReportResponses && !hasReportRuns && !hasReportHistory;
  const reportScore = showTeamReport ? (teamHasData ? reportScoreRaw : 0) : reportScoreRaw;
  const resolvedTeamEngagement =
    teamHasData
      ? hasTeamResponses
        ? teamStats?.engagementAvg ?? 0
        : getEngagementFromParticipation(reportTeam.participation, reportTeam.engagementScore) ?? 0
      : 0;
  const resolvedTeamStress =
    teamHasData
      ? hasTeamResponses && teamStressAvg != null
        ? teamStressAvg
        : getDisplayStressIndex(reportTeam.stressIndex, reportTeam.engagementScore) ?? 0
      : 0;

  const overallDriverCards = hasTeams
    ? [
        { name: isRu ? "Вовлечённость" : "Alignment", score: Math.max(0, avgEngagement), delta: 0 },
        { name: isRu ? "Нагрузка" : "Workload", score: Math.max(0, avgStress), delta: 0 },
      ]
    : [];
  const teamDriverCards =
    reportTeam && showTeamReport && teamHasData
      ? [
          {
            name: isRu ? "Вовлечённость" : "Alignment",
            score: Math.max(0, resolvedTeamEngagement),
            delta: 0,
          },
          {
            name: isRu ? "Нагрузка" : "Workload",
            score: Math.max(0, resolvedTeamStress),
            delta: 0,
          },
        ]
      : [];
  const reportDriverCards = showTeamReport ? teamDriverCards : overallDriverCards;

  const getPeriodBounds = (series: { date?: string | number | Date | null }[], fallbackDate?: Date | null) => {
    const fallback = fallbackDate ?? new Date();
    const firstDate = series[0]?.date ? new Date(series[0].date) : fallback;
    const lastDate = series[series.length - 1]?.date ? new Date(series[series.length - 1].date as any) : fallback;
    return {
      from: firstDate.toISOString().slice(0, 10),
      to: lastDate.toISOString().slice(0, 10),
    };
  };
  const overallPeriod = getPeriodBounds(overallReportTimeseries, safeRuns[0]?.launchedAt ?? null);
  const teamPeriod = getPeriodBounds(teamReportTimeseries, teamRuns[0]?.launchedAt ?? null);
  const reportPeriodFrom = showTeamReport ? teamPeriod.from : overallPeriod.from;
  const reportPeriodTo = showTeamReport ? teamPeriod.to : overallPeriod.to;
  const stressDrivers = getStressDrivers({
    workspaceId: user.organizationId,
    dateRange: { start: new Date(reportPeriodFrom), end: new Date(reportPeriodTo), locale },
  }); // TODO: заменить моки на реальные AI-инсайты на основе ответов опросов.
  const reportTeamParticipation = teamHasData ? Math.round(reportTeam?.participation ?? 0) : 0;
  const reportTeamEngagement = teamHasData ? resolvedTeamEngagement : 0;
  const reportTeamStress = teamHasData ? resolvedTeamStress : 0;
  const teamHasMetrics = !!reportTeam && showTeamReport && teamHasData;
  const teamStatus = reportTeam
    ? getTeamStatus(reportTeamStress, reportTeamEngagement, reportTeamParticipation)
    : "watch";
  const teamStatusAi = teamHasMetrics ? teamStatusMeta[teamStatus].ai : "";
  const teamStatusBadge = teamHasMetrics ? teamStatusMeta[teamStatus] : null;
  const teamDrivers = reportTeam && showTeamReport && teamHasData
    ? [
        {
          name: isRu ? "Вовлечённость" : "Engagement",
          score: resolvedTeamEngagement,
        },
        { name: isRu ? "Нагрузка" : "Workload", score: resolvedTeamStress },
      ]
    : [];
  const teamStrengths = teamHasMetrics
    ? [
        ...(reportTeamEngagement >= 6.5
          ? [isRu ? "Стабильная вовлечённость" : "Stable engagement"]
          : []),
        ...(reportTeamParticipation >= 60
          ? [isRu ? "Хорошее участие" : "Strong participation"]
          : []),
      ]
    : [];
  const teamRisks = teamHasMetrics
    ? [
        ...(reportTeamStress >= 7
          ? [isRu ? "Высокая нагрузка" : "High workload"]
          : []),
        ...(reportTeamParticipation < 60
          ? [isRu ? "Низкое участие" : "Low participation"]
          : []),
      ]
    : [];
  const teamSuggestedActions = teamHasMetrics ? getTeamActionsByStatus(teamStatus).map((a) => a.title) : [];

  const computeWeekdayStreak = (dates: (Date | null | undefined)[]) => {
    const daySet = new Set(
      dates
        .filter((d): d is Date => !!d)
        .map((d) => {
          const local = new Date(d);
          local.setHours(0, 0, 0, 0);
          return local.toISOString().slice(0, 10);
        })
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (true) {
      const day = cursor.getDay();
      if (day === 0 || day === 6) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      const iso = cursor.toISOString().slice(0, 10);
      if (daySet.has(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    return streak;
  };

  const streak = computeWeekdayStreak(overallReportTimeseries.map((p) => (p as any).date ? new Date((p as any).date) : null));
  const focusActions = isDemo ? (initialActions.filter((a) => a.status !== "done").slice(0, 3) as ActionItem[]) : [];
  const dueLabel = (days: number) => {
    if (days < 0) return isRu ? `Просрочено на ${Math.abs(days)} дн.` : `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return isRu ? "Срок сегодня" : "Due today";
    return isRu ? `До срока: ${days} дн.` : `Due in ${days} days`;
  };

  if (!isDemo && !hasTeams && !hasOverallRuns) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
            <h1 className="text-2xl font-semibold text-slate-900">{isRu ? "Обзор" : "Overview"}</h1>
            <p className="text-sm text-slate-600">
              {isRu ? "Данных ещё нет — добавьте команды, чтобы начать собирать метрики." : "No data yet — add teams to start collecting metrics."}
            </p>
          </div>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-semibold text-slate-900">
            {isRu ? "Начните с первого действия" : "Start with your first step"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isRu ? "Добавьте команду, чтобы увидеть метрики стресса и вовлечённости." : "Add a team to see stress and engagement metrics."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app/teams" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary">
              {isRu ? "Добавить команду" : "Add team"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
          <h1 className="text-2xl font-semibold text-slate-900">{isRu ? "Обзор стресса" : "Stress overview"}</h1>
          <p className="text-sm text-slate-600">
            {isRu ? "Краткий снимок состояния рабочего пространства." : "Quick snapshot of your StressSense workspace."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4 text-xs">
          <OverviewReportSelector teams={teamOptions} labels={selectorLabels} showAllOption={isAdminLike || isDemo} />
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            <span>🔥</span>
            <span>{isRu ? `Серия опросов: ${streak} дн.` : `Survey streak: ${streak} days`}</span>
          </div>
        </div>
      </header>

      {!showTeamReport && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">At a glance</p>
              <h3 className="text-xl font-semibold text-slate-900">{isRu ? "Общий обзор стресса" : "Overall stress overview"}</h3>
              <p className="text-sm text-slate-600 max-w-xl">
                {isRu ? "Средние показатели по всем командам." : "Average stress signals across all teams."}
              </p>
              {overallMeta && (
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    overallMeta.tone === "emerald"
                      ? "bg-emerald-50 text-emerald-700"
                      : overallMeta.tone === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : overallMeta.tone === "orange"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {isRu ? overallMeta.label : overallMeta.badge}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Metric label={isRu ? "Средний индекс стресса" : "Average stress index"} value={hasTeams ? `${avgStress.toFixed(1)}` : "—"} />
              <Metric label={isRu ? "Уровень участия" : "Participation rate"} value={hasTeams ? `${participation}%` : "—"} />
              <Metric label={isRu ? "Индекс вовлечённости" : "Engagement score"} value={hasTeams ? `${avgEngagement.toFixed(1)}` : "—"} />
            </div>
          </div>
        </section>
      )}

      {showTeamReport && !teamHasData ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {isRu ? "Отчёт по команде" : "Team survey report"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {isRu
              ? "В этой команде пока нет ответов на опросы. Добавьте участников и запустите опрос."
              : "This team has no survey responses yet. Add members and launch a survey."}
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <SurveyReportWithAiPanel
            title={
              showTeamReport
                ? isRu
                  ? "Отчёт по команде"
                  : "Team survey report"
                : isRu
                  ? "Отчёт по опросу"
                  : "Survey report"
            }
            subtitle={
              showTeamReport
                ? reportTeam?.name ?? ""
                : isRu
                  ? "Онлайн-просмотр"
                  : "Live preview"
            }
            score={reportScore || 0}
            delta={0}
            deltaDirection="flat"
            periodLabel={isRu ? "Последние 6 месяцев" : "Last 6 months"}
            timeseries={reportTimeseries}
            drivers={reportDriverCards}
            ctaLabel={isRu ? "Проанализировать вовлечённость" : "Analyze engagement"}
            locale={locale}
            reportContext={{
              scope: showTeamReport ? "team" : "org",
              scopeId: showTeamReport ? reportTeam?.id ?? user.organizationId : user.organizationId,
              dateRange: { from: reportPeriodFrom, to: reportPeriodTo },
            }}
            aiEnabled={aiEnabled}
          />
          {showSurveyNotice && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>
                {showTeamReport
                  ? isRu
                    ? "Данных по опросам команды пока нет."
                    : "No team survey data yet."
                  : isRu
                    ? "Данных опросов пока нет."
                    : "No survey data yet."}
              </span>
            </div>
          )}
        </section>
      )}

      {!showTeamReport && (
        <StressDriversGrid
          drivers={stressDrivers}
          title={isRu ? "Драйверы стресса" : "Stress drivers"}
          subtitle={
            isRu
              ? "Сводка по ключевым факторам стресса: как они изменились за выбранный период."
              : "A summary of key stress factors and how they changed in the selected period."
          }
          emptyMessage={
            isRu
              ? "AI-инсайты по драйверам появятся после первых опросов."
              : "AI driver insights will appear after the first surveys."
          }
        />
      )}

      {/* Убрали дублирующий блок "Фокус недели" с nudges */}

    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
