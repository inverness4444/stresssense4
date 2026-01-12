"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/i18n";
import type { TrendPoint } from "@/components/EngagementTrendCard";
import { SurveyReportWithAiPanel } from "@/components/app/SurveyReportWithAiPanel";
import { StressDriversGrid } from "@/components/app/StressDriversGrid";
import { getStressDrivers } from "@/lib/aiStressDrivers";

type HomeData = Awaited<ReturnType<typeof import("../../actions").getMyHomeData>>;

export default function MyHomeClient({
  data,
  userName,
  userId,
  locale,
  aiEnabled,
}: {
  data: HomeData;
  userName: string;
  userId: string;
  locale: Locale;
  aiEnabled: boolean;
}) {
  const isRu = locale === "ru";
  const stressScore = data.personalStatus.stress.score;
  const participation = data.personalStatus.engagement.participation;
  const engagementScore = data.personalStatus.engagement.score;
  const displayStress = stressScore ?? null;

  const trendSource =
    (data.personalStatus.stress as any)?.timeseries ?? (data.personalStatus.engagement as any)?.timeseries ?? [];
  const trendData: TrendPoint[] =
    trendSource.length > 0
      ? trendSource.map((p: any, idx: number) => ({
          label: p.date
            ? new Date(p.date).toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short", day: "numeric" })
            : `W${idx + 1}`,
          value: (p as any).score ?? (p as any).value ?? 0,
          date: p.date ?? new Date(Date.now() - (trendSource.length - idx - 1) * 7 * 24 * 60 * 60 * 1000),
        }))
      : [];

  const drivers = [
    { name: isRu ? "Вовлечённость" : "Engagement", score: Number(engagementScore ?? 0), delta: 0 },
    { name: isRu ? "Нагрузка" : "Workload", score: Number(displayStress ?? 0), delta: 0 },
  ];

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

  const history = useMemo(() => {
    const source = data.surveyHistory ?? [];
    return source
      .map((run: any) => {
        const startedAt = run.startedAt ? new Date(run.startedAt) : null;
        const finishedAt = run.finishedAt ? new Date(run.finishedAt) : startedAt;
        if (!startedAt || !finishedAt) return null;
        return {
          id: run.id,
          startedAt,
          finishedAt,
          durationMs:
            typeof run.durationMs === "number"
              ? run.durationMs
              : Math.max(0, finishedAt.getTime() - startedAt.getTime()),
          score: Number(run.score ?? 0),
        };
      })
      .filter((run: any): run is { id: string; startedAt: Date; finishedAt: Date; durationMs: number; score: number } => Boolean(run));
  }, [data.surveyHistory]);

  const streak = useMemo(() => (history.length ? computeWeekdayStreak(history.map((h) => h.startedAt)) : 0), [history]);
  const formatDate = (d: Date) =>
    d.toLocaleString(isRu ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    if (mins <= 0) return isRu ? `${secs} c` : `${secs} sec`;
    return isRu ? `${mins} мин ${secs.toString().padStart(2, "0")} c` : `${mins} min ${secs.toString().padStart(2, "0")} sec`;
  };

  const reportTimeseries = useMemo(() => {
    if (trendData.length > 0) return trendData;
    if (history.length > 0) {
      return history.map((run, idx) => ({
        label: run.startedAt.toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short", day: "numeric" }),
        value: run.score ?? displayStress ?? 0,
        date: run.startedAt,
      }));
    }
    const base = Number.isFinite(displayStress as number) ? (displayStress ?? 0) : 0;
    const points = 4;
    const now = Date.now();
    return Array.from({ length: points }, (_, idx) => {
      const date = new Date(now - (points - idx - 1) * 7 * 24 * 60 * 60 * 1000);
      return {
        label: date.toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short", day: "numeric" }),
        value: base,
        date,
      };
    });
  }, [trendData, history, stressScore, isRu]);

  const firstDate = reportTimeseries[0]?.date ? new Date(reportTimeseries[0].date as any) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const lastDate = reportTimeseries[reportTimeseries.length - 1]?.date ? new Date(reportTimeseries[reportTimeseries.length - 1].date as any) : new Date();
  const periodFrom = firstDate.toISOString().slice(0, 10);
  const periodTo = lastDate.toISOString().slice(0, 10);
  const stressDrivers = getStressDrivers({
    workspaceId: data.orgId,
    userId,
    dateRange: { start: new Date(periodFrom), end: new Date(periodTo), locale },
  }); // TODO: заменить моки на реальные AI-инсайты на основе ответов опросов.

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
          <h1 className="text-2xl font-semibold text-slate-900">{isRu ? "Мой wellbeing" : "My wellbeing"}</h1>
          <p className="text-sm text-slate-600">
            {isRu ? "Личные метрики стресса и вовлечённости." : "Your personal stress and engagement snapshot."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            <span>🔥</span>
            <span>{isRu ? `Серия чек-инов: ${streak} дн.` : `Check-in streak: ${streak} days`}</span>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{isRu ? "Мои метрики" : "At a glance"}</p>
            <h3 className="text-xl font-semibold text-slate-900">{isRu ? `Привет, ${userName || "коллега"}` : `Hi ${userName || "there"}`}</h3>
            <p className="text-sm text-slate-600 max-w-xl">
              {isRu ? "Это ваши персональные сигналы: стресс, участие и вовлечённость." : "Your personal signals: stress, participation, engagement."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <Metric label={isRu ? "Мой индекс стресса" : "My stress index"} value={displayStress !== undefined && displayStress !== null ? `${displayStress.toFixed(1)}` : "—"} />
            <Metric label={isRu ? "Участие" : "Participation"} value={participation !== undefined && participation !== null ? `${participation}%` : "—"} />
            <Metric label={isRu ? "Моя вовлечённость" : "My engagement"} value={engagementScore !== undefined && engagementScore !== null ? `${engagementScore.toFixed(1)}` : "—"} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <SurveyReportWithAiPanel
          title={isRu ? "Мой отчёт" : "My report"}
          subtitle={isRu ? "Личный просмотр" : "Personal view"}
          score={displayStress ?? 0}
          delta={0}
          deltaDirection="flat"
          periodLabel={isRu ? "Последние недели" : "Recent weeks"}
          timeseries={reportTimeseries}
          drivers={drivers}
          ctaLabel={isRu ? "Проанализировать вовлечённость" : "Analyze engagement"}
          locale={locale}
          reportContext={{ scope: "user", scopeId: userId, dateRange: { from: periodFrom, to: periodTo } }}
          aiEnabled={aiEnabled}
        />
      </section>

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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{isRu ? "История стресс-опросов" : "Survey history"}</p>
            <p className="text-sm text-slate-600">{isRu ? "Когда начинали, сколько длилось и балл" : "Start time, duration, score"}</p>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{isRu ? "Начало" : "Started"}</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{isRu ? "Длительность" : "Duration"}</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{isRu ? "Результат" : "Score"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((run) => {
                const duration = run.durationMs;
                return (
                  <tr key={run.id} className="transition hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-sm text-slate-800">{formatDate(run.startedAt)}</td>
                    <td className="px-3 py-2 text-sm text-slate-800">{formatDuration(duration)}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">{run.score.toFixed(1)} pt</td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-sm text-slate-600">
                    {isRu ? "История будет, когда пройдёте опрос." : "History will appear after you complete a pulse."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
