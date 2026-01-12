"use client";

import { useMemo, useState, useTransition } from "react";
import { EngagementTrendCard, type TrendPoint } from "@/components/EngagementTrendCard";
import { StressDriversGrid } from "@/components/app/StressDriversGrid";
import { getTeamStatus, teamStatusMeta } from "@/lib/statusLogic";
import { getStressDrivers } from "@/lib/aiStressDrivers";
import type { Locale } from "@/lib/i18n";

type SerializableActionItem = {
  id: string;
  organizationId: string;
  teamId: string | null;
  managerUserId: string | null;
  type: string;
  sourceRef: string | null;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completedByUserId: string | null;
};

type TeamCard = {
  teamId: string;
  name: string;
  engagement: { score: number; delta: number; timeseries: { date: string; score: number }[] };
  stress: { index: number; delta: number; riskLevel: string; trend?: string };
  participation: { rate: number; delta: number };
  actionItems: SerializableActionItem[];
  upcoming: { type: string; title: string; date: string; ref: string }[];
  aiLens: { summary: string; risks: string[]; strengths: string[]; suggestedActions: string[] };
  drivers?: { name: string; score: number | null; delta?: number | null }[];
};

export type ManagerHomeData = {
  orgId: string;
  teams: { teamId: string; name: string }[];
  primaryTeamId: string;
  teamCards: Record<string, TeamCard>;
};

export function ManagerHomeClient({ data, locale = "en" }: { data: ManagerHomeData; locale?: Locale }) {
  const [selectedTeam, setSelectedTeam] = useState<string>(data.primaryTeamId);
  const [isPending, startTransition] = useTransition();
  const isRu = locale === "ru";

  const hasTeams = data.teams.length > 0;
  const activeCard = useMemo(() => data.teamCards[selectedTeam] ?? Object.values(data.teamCards)[0], [data.teamCards, selectedTeam]);
  const participationPct = Math.round((activeCard?.participation.rate ?? 0) * 100);
  const teamStatus = activeCard ? getTeamStatus(activeCard.stress.index ?? 0, activeCard.engagement.score ?? 0, participationPct) : "watch";
  const statusMeta = teamStatusMeta[teamStatus];
  const toneClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const engagementData: TrendPoint[] = (activeCard?.engagement.timeseries ?? []).map((p, idx) => ({
    label: p.date ? new Date(p.date).toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short" }) : `P${idx + 1}`,
    value: (p as any).score ?? (p as any).value ?? 0,
  }));
  const hasTrend = engagementData.length > 0;
  const engagementDelta = activeCard && hasTrend ? activeCard.engagement.score - (engagementData[0]?.value ?? activeCard.engagement.score) : 0;
  const actionItems = activeCard?.actionItems ?? [];

  if (!hasTeams || !activeCard) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-slate-900">{isRu ? "Пока нет команд." : "No teams yet."}</p>
        <p className="mt-1 text-sm text-slate-600">
          {isRu ? "Создайте первую команду, чтобы увидеть данные." : "Create your first team to see data."}
        </p>
        <div className="mt-4 flex gap-3">
          <a href="/app/teams" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105">
            {isRu ? "Добавить команду" : "Add team"}
          </a>
        </div>
      </div>
    );
  }

  const trendSeries = activeCard?.engagement.timeseries ?? [];
  const trendStart = trendSeries[0]?.date ? new Date(trendSeries[0].date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trendEnd = trendSeries[trendSeries.length - 1]?.date ? new Date(trendSeries[trendSeries.length - 1].date) : new Date();
  const stressDrivers = getStressDrivers({
    workspaceId: data.orgId,
    dateRange: { start: trendStart, end: trendEnd, locale },
  }); // TODO: заменить моки на реальные AI-инсайты на основе ответов опросов.

  const handleComplete = (_id: string, _status: "done" | "dismissed") => {
    startTransition(() => {});
  };

  const handleCreateAction = async (_title: string, _description?: string) => {
    startTransition(() => {});
  };

  const watchThreshold = 7.5;
  const hasMetrics = (activeCard.engagement.score ?? 0) > 0 || (activeCard.stress.index ?? 0) > 0 || (activeCard.participation.rate ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Кабинет менеджера" : "Manager cockpit"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isRu ? "Ваши команды одним взглядом" : "Your teams at a glance"}
          </h1>
          <p className="text-sm text-slate-600">
            {isRu ? "Вовлечённость, стресс, действия и AI-подсказки в одном месте." : "Engagement, stress, actions, and AI insights in one place."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"
          >
            {data.teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
          <div className={`rounded-full px-4 py-2 text-xs font-semibold shadow-sm ring-1 ${toneClasses[statusMeta.tone]}`}>
            {isRu ? "Здоровье команды" : "Team health"}: {hasMetrics ? statusMeta.badge : isRu ? "Нет данных" : "No data"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr_0.9fr]">
        {hasTrend ? (
          <EngagementTrendCard
            scope="team"
            title={isRu ? "Вовлечённость и стресс" : "Team engagement & stress"}
            score={activeCard.engagement.score}
            delta={engagementDelta}
            participation={participationPct}
            trendLabel={isRu ? "за последние 4 спринта" : "last 4 sprints"}
            data={engagementData}
            locale={locale}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Нет данных опросов" : "No survey data yet"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {isRu ? "Данные появятся после первых опросов." : "Data will appear after the first surveys."}
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Стресс и риски" : "Stress & risk"}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-xl font-semibold text-amber-700">
              {hasMetrics ? activeCard.stress.index.toFixed(1) : "—"}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{hasMetrics ? statusMeta.label : isRu ? "Нет данных" : "No data yet"}</p>
              <p className="text-sm text-slate-600">{hasMetrics ? statusMeta.summary : isRu ? "Данные появятся после опроса." : "Data will appear after a survey."}</p>
              <p className="text-xs text-emerald-600 mt-1">
                {isRu ? "Тренд" : "Trend"}: {hasMetrics ? activeCard.stress.trend ?? "stable" : isRu ? "недоступен" : "not available"}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {isRu ? "Участие" : "Participation"}: {hasMetrics ? (activeCard.participation.rate * 100).toFixed(0) : "—"}%
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "Участие" : "Participation"}
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, activeCard.participation.rate * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {isRu ? "Участие в последнем pulse" : "Latest pulse participation"}
          </p>
          <p className="text-xs text-slate-500">
            {hasMetrics ? (
              <>
                {activeCard.participation.delta >= 0 ? "+" : "-"}
                {(Math.abs(activeCard.participation.delta) * 100).toFixed(1)} {isRu ? "п." : "pts"} {isRu ? "к прошлому циклу" : "vs last cycle"}
              </>
            ) : (
              <span>{isRu ? "Данные появятся после опроса." : "Data will appear after your first survey."}</span>
            )}
          </p>
        </div>
      </div>

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

     <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Action center" : "Action center"}</p>
            <button className="text-sm font-semibold text-primary" onClick={() => handleCreateAction("New action")}>
              {isRu ? "Добавить" : "Add"}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {actionItems.length === 0 && <p className="text-sm text-slate-500">{isRu ? "Нет открытых задач." : "No open items."}</p>}
            {actionItems.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500 capitalize">{a.type}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => handleComplete(a.id, "done")}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                >
                  {isRu ? "Готово" : "Done"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{isRu ? "Ближайшее" : "Upcoming"}</p>
            <span className="text-xs text-slate-500">{isRu ? "Следующие 2 недели" : "Next 2 weeks"}</span>
          </div>
          <div className="mt-3 space-y-3">
            {activeCard.upcoming.length === 0 && <p className="text-sm text-slate-500">{isRu ? "Пока ничего не запланировано." : "Nothing scheduled."}</p>}
            {activeCard.upcoming.map((e) => (
              <div key={e.ref + e.date} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{e.type}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{e.title}</p>
                  <p className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">{isRu ? "Мои команды" : "My teams"}</p>
          <span className="text-xs text-slate-500">{isRu ? "Стресс / Вовлечённость / Участие" : "Stress / Engagement / Participation"}</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.teams.map((t) => {
            const card = data.teamCards[t.teamId];
            const stress = card?.stress.index ?? 0;
            const hasCardData = (card?.stress.index ?? 0) > 0 || (card?.engagement.score ?? 0) > 0 || (card?.participation.rate ?? 0) > 0;
            const badge = stress >= watchThreshold ? (isRu ? "At risk" : "At risk") : isRu ? "Watch" : "Watch";
            const badgeClass = stress >= watchThreshold ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
            return (
              <div key={t.teamId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${badgeClass}`}>{hasCardData ? badge : isRu ? "Нет данных" : "No data"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{isRu ? "Стресс" : "Stress"} {hasCardData ? (card?.stress.index ?? 0).toFixed(1) : "—"}</span>
                  <span>{isRu ? "Вовл." : "Eng"} {hasCardData ? (card?.engagement.score ?? 0).toFixed(1) : "—"}</span>
                  <span>{isRu ? "Участие" : "Part"} {hasCardData ? Math.round((card?.participation.rate ?? 0) * 100) : "—"}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
