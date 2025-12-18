"use client";

import { useMemo, useState } from "react";
import type { ActionItem, NudgeItem, RiskLevel, ActionStatus } from "@/lib/actionCenterMocks";
import { completedMocks, initialActions, initialNudges } from "@/lib/actionCenterMocks";
import { t, type Locale } from "@/lib/i18n";

type TeamOption = { id: string; name: string };

export function ActionCenterClient({ teams, defaultTeamId, locale }: { teams: TeamOption[]; defaultTeamId?: string; locale: Locale }) {
  const [actions, setActions] = useState<ActionItem[]>(() =>
    initialActions.map((a) => ({
      ...a,
      teamName: teams.find((t) => t.id === a.teamId)?.name ?? a.teamName,
    }))
  );
  const [nudges, setNudges] = useState<NudgeItem[]>(initialNudges);
  const [selectedTeam, setSelectedTeam] = useState<string>(defaultTeamId ?? "all");
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("all");
  const [tab, setTab] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [expandedFocus, setExpandedFocus] = useState<Record<string, boolean>>({});
  const [driverFilter, setDriverFilter] = useState<"all" | "workload" | "meetings" | "clarity" | "support">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");

  const summary = useMemo(() => {
    const byTeam = (a: ActionItem) => (selectedTeam === "all" ? true : a.teamId === selectedTeam);
    const byLevel = (a: ActionItem) => (levelFilter === "all" ? true : a.riskLevel === levelFilter);
    const byDriver = (a: ActionItem) => (driverFilter === "all" ? true : a.tags.includes(driverFilter) || a.driver.toLowerCase().includes(driverFilter));
    const byPriority = (a: ActionItem) => (priorityFilter === "all" ? true : a.priority === priorityFilter);
    const filtered = actions.filter((a) => byTeam(a) && byLevel(a) && byDriver(a) && byPriority(a));
    const counts = filtered.reduce(
      (acc, a) => {
        acc.total += 1;
        acc[a.status] += 1;
        return acc;
      },
      { total: 0, todo: 0, in_progress: 0, done: 0 } as { total: number; todo: number; in_progress: number; done: number }
    );
    return counts;
  }, [actions, levelFilter, selectedTeam, driverFilter, priorityFilter]);

  const focusActions = useMemo(() => {
    return actions
      .filter((a) => a.status !== "done")
      .filter((a) => (selectedTeam === "all" ? true : a.teamId === selectedTeam))
      .sort((a, b) => (a.priority === "High" ? -1 : 1))
      .slice(0, 3);
  }, [actions, selectedTeam]);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      const byTeam = selectedTeam === "all" ? true : a.teamId === selectedTeam;
      const byLevel = levelFilter === "all" ? true : a.riskLevel === levelFilter;
      const byStatus = tab === "all" ? true : a.status === tab;
      const byFilter = statusFilter === "all" ? true : a.status === statusFilter;
      const byDriver = driverFilter === "all" ? true : a.tags.includes(driverFilter) || a.driver.toLowerCase().includes(driverFilter);
      const byPriority = priorityFilter === "all" ? true : a.priority === priorityFilter;
      return byTeam && byLevel && byStatus && byFilter && byDriver && byPriority;
    });
  }, [actions, levelFilter, selectedTeam, statusFilter, tab, driverFilter, priorityFilter]);

  const completedActions = useMemo(() => actions.filter((a) => a.status === "done"), [actions]);

  const statusTone = (status: ActionStatus) =>
    status === "todo"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  const riskTone = (level: RiskLevel) =>
    level === "AtRisk" ? "bg-rose-50 text-rose-700 ring-rose-200" : level === "UnderPressure" ? "bg-orange-50 text-orange-700 ring-orange-200" : "bg-amber-50 text-amber-700 ring-amber-200";

  const dueLabel = (days: number) => {
    if (days < 0) return t(locale, "actionDueOverdue").replace("{{days}}", Math.abs(days).toString());
    if (days === 0) return t(locale, "actionDueToday");
    return t(locale, "actionDueIn").replace("{{days}}", days.toString());
  };

  const addNudgeAsAction = (n: NudgeItem) => {
    const team = teams[0];
    setActions((prev) => [
      {
        id: `new-${Date.now()}`,
        title: n.title,
        description: n.bullets[0] ?? t(locale, "actionDemoNudgeDesc"),
        teamId: team?.id ?? "team",
        teamName: team?.name ?? t(locale, "actionDemoTeam"),
        status: "todo",
        driver: t(locale, "actionDemoDriver"),
        sourceSurveyDate: t(locale, "actionDemoSource"),
        tags: n.tags,
        dueInDays: 3,
        priority: "Medium",
        riskLevel: "Watch",
        owner: { name: t(locale, "actionDemoOwnerName"), role: t(locale, "actionDemoOwnerRole"), initials: "AI" },
        format: t(locale, "actionDemoFormat"),
        impact: t(locale, "actionDemoImpact"),
        effort: t(locale, "actionDemoEffort"),
        metricTarget: t(locale, "actionDemoMetricTarget"),
      },
      ...prev,
    ]);
  };

  const markDone = (id: string) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status: "done" } : a)));
  };

  const ownerBadge = (a: ActionItem) => (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
        {a.owner.initials}
      </span>
      <div className="text-xs text-slate-600">
        <p className="font-semibold text-slate-800">{t(locale, "actionOwnerLabel")}: {a.owner.name}</p>
        <p className="text-[11px] text-slate-500">{a.owner.role}</p>
      </div>
    </div>
  );

  const impactBadges = (a: ActionItem) => (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-200">
        {t(locale, "actionImpactLabel")}: {a.impact}
      </span>
      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-200">
        {t(locale, "actionEffortLabel")}: {a.effort}
      </span>
    </div>
  );

  const metricBlock = (a: ActionItem) => (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-inner">
      <p className="font-semibold text-slate-700">{t(locale, "actionMetricTarget")}: {a.metricTarget}</p>
      {a.metricBefore !== undefined && a.metricAfter !== undefined && a.metricPeriodWeeks !== undefined && (
        <p className="mt-1 text-slate-600">
          {t(locale, "actionMetricBeforeAfter")
            .replace("{{from}}", a.metricBefore.toFixed(1))
            .replace("{{to}}", a.metricAfter.toFixed(1))
            .replace("{{weeks}}", a.metricPeriodWeeks.toString())}
        </p>
      )}
    </div>
  );

  const sourceLine = (a: ActionItem) => (
    <p className="text-[11px] text-slate-600">
      {t(locale, "actionSource")} {locale === "ru" ? `от ${a.sourceSurveyDate}, ${t(locale, "actionDriverLabel").toLowerCase()} ${a.driver}` : `on ${a.sourceSurveyDate}, ${t(locale, "actionDriverLabel").toLowerCase()} ${a.driver}`}
    </p>
  );

  const uniqueTeamsCount = useMemo(() => new Set(actions.map((a) => a.teamId)).size, [actions]);
  const atRiskTeams = useMemo(
    () => new Set(actions.filter((a) => a.riskLevel === "AtRisk").map((a) => a.teamId)).size,
    [actions]
  );
  const avgStressAtRisk = 7.3; // демо значение
  const topDriver = "workload";
  const lastUpdate = "12.12.2025";
  const priorityRank = { High: 0, Medium: 1, Low: 2 } as const;
  const riskLabel = (r: RiskLevel) =>
    r === "AtRisk" ? t(locale, "riskLabelAtRisk") : r === "UnderPressure" ? t(locale, "riskLabelUnderPressure") : t(locale, "riskLabelWatch");
  const statusLabel = (s: ActionStatus) =>
    s === "in_progress" ? t(locale, "actionTabsInProgress") : s === "todo" ? t(locale, "actionTabsTodo") : t(locale, "actionTabsDone");
  const priorityLabel = (p: ActionItem["priority"]) =>
    p === "High" ? t(locale, "priorityLabelHigh") : p === "Medium" ? t(locale, "priorityLabelMedium") : t(locale, "priorityLabelLow");

  const addDemoAction = () => {
    const team = teams[0];
    setActions((prev) => [
      {
        id: `demo-${Date.now()}`,
        title: t(locale, "actionDemoNewTitle"),
        description: t(locale, "actionDemoNewDesc"),
        teamId: team?.id ?? "team",
        teamName: team?.name ?? t(locale, "actionDemoTeam"),
        status: "todo",
        driver: t(locale, "actionDemoDriver"),
        sourceSurveyDate: lastUpdate,
        tags: ["workload", "support"],
        dueInDays: 5,
        priority: "High",
        riskLevel: "AtRisk",
        owner: { name: t(locale, "actionDemoOwnerFocusName"), role: t(locale, "actionDemoOwnerFocusRole"), initials: t(locale, "actionDemoOwnerFocusInitials") },
        format: "1:1",
        impact: t(locale, "actionDemoImpactHigh"),
        effort: t(locale, "actionDemoEffortLow"),
        metricTarget: t(locale, "actionDemoMetricTarget"),
        metricBefore: 7.3,
        metricAfter: 7.0,
        metricPeriodWeeks: 4,
      },
      ...prev,
    ]);
  };

  const ActionCard = ({ action, onDone }: { action: ActionItem; onDone: (id: string) => void }) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {ownerBadge(action)}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${statusTone(action.status)}`}>{statusLabel(action.status)}</span>
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${riskTone(action.riskLevel)}`}>{riskLabel(action.riskLevel)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{priorityLabel(action.priority)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {t(locale, "actionCardFormat")}: {action.format}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {t(locale, "actionCardDue")} {dueLabel(action.dueInDays)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-800">{action.teamName}</span>
        <span className="text-slate-500">{t(locale, "actionOwnerRoleSep")}</span>
        <span>{action.owner.role}</span>
      </div>
      <div className="mt-2">{impactBadges(action)}</div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{action.title}</p>
      <p className="text-xs text-slate-600">{action.description}</p>
      <p className="mt-1 text-xs font-semibold text-slate-700">{t(locale, "actionDriverLabel")}: {action.driver}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {action.tags.map((t) => (
          <span key={t} className="rounded-full bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary">
            {t}
          </span>
        ))}
      </div>
      {metricBlock(action)}
      <div className="mt-2 text-[11px] text-slate-600">{sourceLine(action)}</div>
      {action.status !== "done" && (
        <button
          onClick={() => onDone(action.id)}
          className="mt-3 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          {t(locale, "actionButtonDone")}
        </button>
      )}
      {action.status === "done" && <p className="mt-2 text-xs font-semibold text-emerald-700">{t(locale, "actionTabsDone")}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">StressSense</p>
          <h2 className="text-xl font-semibold text-slate-900">{t(locale, "actionTitle")}</h2>
          <p className="text-sm text-slate-600">{t(locale, "actionSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">{t(locale, "actionFiltersTeam")}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ActionStatus | "all")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">{t(locale, "actionFiltersStatus")}</option>
            <option value="todo">{t(locale, "actionTabsTodo")}</option>
            <option value="in_progress">{t(locale, "actionTabsInProgress")}</option>
            <option value="done">{t(locale, "actionTabsDone")}</option>
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as RiskLevel | "all")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">{t(locale, "actionFiltersLevel")}</option>
            <option value="Watch">{t(locale, "riskLabelWatch")}</option>
            <option value="UnderPressure">{t(locale, "riskLabelUnderPressure")}</option>
            <option value="AtRisk">{t(locale, "riskLabelAtRisk")}</option>
          </select>
          <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value as any)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">{t(locale, "actionFiltersDriver")}</option>
            <option value="workload">{t(locale, "actionFiltersDriverWorkload")}</option>
            <option value="meetings">{t(locale, "actionFiltersDriverMeetings")}</option>
            <option value="clarity">{t(locale, "actionFiltersDriverClarity")}</option>
            <option value="support">{t(locale, "actionFiltersDriverSupport")}</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">{t(locale, "actionFiltersPriority")}</option>
            <option value="High">{t(locale, "actionFiltersPriorityHigh")}</option>
            <option value="Medium">{t(locale, "actionFiltersPriorityMedium")}</option>
            <option value="Low">{t(locale, "actionFiltersPriorityLow")}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "actionSummaryTitle")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: t(locale, "actionSummaryTotal"), value: summary.total, tone: "bg-slate-50 text-slate-800 ring-slate-200" },
              { label: t(locale, "actionSummaryTodo"), value: summary.todo, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
              { label: t(locale, "actionSummaryInProgress"), value: summary.in_progress, tone: "bg-blue-50 text-blue-700 ring-blue-200" },
              { label: t(locale, "actionSummaryDone"), value: summary.done, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl px-3 py-3 text-sm font-semibold shadow-sm ring-1 ${item.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{item.label}</p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span>{t(locale, "actionSummaryUpdated")}: {lastUpdate}</span>
            <span>{t(locale, "actionSummaryCoveredTeams")}: {uniqueTeamsCount} {t(locale, "actionOwnerRoleSep")} {teams.length}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "actionStressBlockTitle")}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-800">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <span>{t(locale, "actionStressBlockAtRisk")}</span>
              <span className="font-semibold">{atRiskTeams}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <span>{t(locale, "actionStressBlockAvgStress")}</span>
              <span className="font-semibold">{avgStressAtRisk.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <span>{t(locale, "actionStressBlockTopDriver")}</span>
              <span className="font-semibold capitalize">{topDriver}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-600">
        {t(locale, "actionHint")}
      </p>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "focusTitle")}</p>
              <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">{t(locale, "focusBadgeAi")}</span>
            </div>
            <p className="text-sm text-slate-600">{t(locale, "focusSubtitle")}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {focusActions
            .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
            .slice(0, 3)
            .map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">{ownerBadge(a)}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${riskTone(a.riskLevel)}`}>{riskLabel(a.riskLevel)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{a.teamName} {t(locale, "actionOwnerRoleSep")} {a.owner.role}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">{priorityLabel(a.priority)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    {t(locale, "actionCardDue")} {dueLabel(a.dueInDays)}
                  </span>
                </div>
                <div className="mt-2">{impactBadges(a)}</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-600">{a.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.tags.map((t) => (
                    <span key={t} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => markDone(a.id)}
                  className="mt-3 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
                >
                  {t(locale, "actionButtonDone")}
                </button>
              </div>
            ))}
          {focusActions.length === 0 && <p className="text-sm text-slate-600">{t(locale, "focusNone")}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "actionListTitle")}</p>
            <p className="text-sm text-slate-600">{t(locale, "actionListSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {[
              { key: "all", label: t(locale, "actionTabsAll") },
              { key: "todo", label: t(locale, "actionTabsTodo") },
              { key: "in_progress", label: t(locale, "actionTabsInProgress") },
              { key: "done", label: t(locale, "actionTabsDone") },
            ].map((tOpt) => (
              <button
                key={tOpt.key}
                onClick={() => setTab(tOpt.key as any)}
                className={`rounded-full px-3 py-1 ring-1 ${tab === tOpt.key ? "bg-primary text-white ring-primary" : "bg-white text-slate-700 ring-slate-200"}`}
              >
                {tOpt.label}
              </button>
            ))}
            <button
              onClick={addDemoAction}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t(locale, "actionAdd")}
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {filteredActions.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">☁️</div>
              <p className="font-semibold text-slate-800">{t(locale, "actionEmptyTitle")}</p>
              <p className="text-xs text-slate-600">{t(locale, "actionEmptyHint")}</p>
            </div>
          )}
          {filteredActions.map((a) => (
            <ActionCard key={a.id} action={a} onDone={markDone} />
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "actionNudgesTitle")}</p>
            <p className="text-sm text-slate-600">{t(locale, "actionNudgesSubtitle")}</p>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {nudges.map((n) => (
            <div key={n.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {n.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-600">{t(locale, "actionNudgeApplicable")} {n.applicableTeams}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => addNudgeAsAction(n)}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
                >
                  {t(locale, "actionAddFromNudge")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t(locale, "actionHistoryTitle")}</p>
          <p className="text-sm text-slate-600">{t(locale, "actionHistorySubtitle")}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {completedMocks.slice(0, 5).map((c) => {
              const tone = c.delta < 0 ? "text-emerald-700 bg-emerald-50 ring-emerald-200" : "text-amber-700 bg-amber-50 ring-amber-200";
              return (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-600">
                    {c.teamName} · {c.period}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t(locale, "actionHistoryFinished")}{" "}
                    {new Date(c.finishedAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")}
                  </p>
                  <p className="text-xs text-slate-700">
                    {t(locale, "actionHistoryDriver")} {c.driver}
                  </p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${tone}`}>
                    Stress index {c.delta < 0 ? "↓" : "↑"} {Math.abs(c.delta).toFixed(1)} pt · {c.from.toFixed(1)} → {c.to.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
