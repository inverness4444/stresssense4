"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { TrendPoint } from "@/components/EngagementTrendCard";
import { SurveyReportWithAiPanel } from "@/components/app/SurveyReportWithAiPanel";

type HomeData = Awaited<ReturnType<typeof import("../../actions").getMyHomeData>>;

export default function MyHomeClient({ data, userName, locale }: { data: HomeData; userName: string; locale: Locale }) {
  const isRu = locale === "ru";

  const stressScore = data.personalStatus.stress.score ?? 6.4;
  const engagementScore = data.personalStatus.engagement.score ?? 7.3;
  const participation = data.personalStatus.engagement.participation ?? 76;
  const surveysCount = 1;

  const trendSource = (data.personalStatus.engagement as any)?.timeseries ?? [];
  const trendData: TrendPoint[] =
    trendSource.length > 0
      ? trendSource.map((p: any, idx: number) => ({
          label: p.date ? new Date(p.date).toLocaleDateString("ru-RU", { month: "short", day: "numeric" }) : `W${idx + 1}`,
          value: (p as any).score ?? (p as any).value ?? engagementScore,
          date: p.date ?? new Date(Date.now() - (trendSource.length - idx - 1) * 7 * 24 * 60 * 60 * 1000),
        }))
      : [
          { label: "Пн", value: engagementScore - 0.2, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { label: "Вт", value: engagementScore - 0.1, date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
          { label: "Ср", value: engagementScore, date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
          { label: "Чт", value: engagementScore + 0.1, date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) },
          { label: "Пт", value: engagementScore + 0.2, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { label: "Пн", value: engagementScore + 0.3, date: new Date() },
        ];

  const drivers = [
    { name: "Поддержка менеджера", score: 7.5, delta: 0.3 },
    { name: "Признание", score: 7.2, delta: 0.1 },
    { name: "Нагрузка", score: stressScore, delta: -0.2 },
    { name: "Баланс", score: 6.8, delta: -0.1 },
    { name: "Фокус", score: 7.0, delta: 0.2 },
  ];

  const firstDate = trendData[0]?.date ? new Date(trendData[0].date as any) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const lastDate = trendData[trendData.length - 1]?.date ? new Date(trendData[trendData.length - 1].date as any) : new Date();
  const periodFrom = firstDate.toISOString().slice(0, 10);
  const periodTo = lastDate.toISOString().slice(0, 10);

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

  const [history, setHistory] = useState<{ id: string; startedAt: Date; finishedAt: Date; score: number }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("stressSurveyHistory");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { id: string; startedAt: string; finishedAt: string; score: number }[];
        const mapped = parsed.map((h) => ({
          ...h,
          startedAt: new Date(h.startedAt),
          finishedAt: new Date(h.finishedAt),
          score: h.score,
        }));
        setHistory(mapped);
        return;
      } catch {
        // fall back to default below
      }
    }
    // fallback mock if no history yet
    setHistory([
      { id: "self-1", startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000), finishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 1000), score: 7.2 },
      { id: "self-2", startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000), finishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 7 * 60 * 1000), score: 6.9 },
    ]);
  }, []);

  const streak = useMemo(
    () =>
      history.length
        ? computeWeekdayStreak(history.map((h) => h.startedAt))
        : computeWeekdayStreak(trendData.map((p) => (p.date ? new Date(p.date as any) : null))),
    [history, trendData]
  );

  const formatDate = (d: Date) =>
    d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    if (mins <= 0) return `${secs} c`;
    return `${mins} мин ${secs.toString().padStart(2, "0")} c`;
  };

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
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Metric label={isRu ? "Мой индекс стресса" : "My stress index"} value={`${stressScore.toFixed(1)}`} />
            <Metric label={isRu ? "Участие" : "Participation"} value={`${participation}%`} />
            <Metric label={isRu ? "Моя вовлечённость" : "My engagement"} value={`${engagementScore.toFixed(1)}`} />
            <Metric label={isRu ? "Активных опросов" : "Active surveys"} value={`${surveysCount}`} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <SurveyReportWithAiPanel
          title={isRu ? "Мой отчёт" : "My report"}
          subtitle={isRu ? "Личный просмотр" : "Personal view"}
          score={engagementScore}
          delta={0.3}
          deltaDirection="up"
          periodLabel={isRu ? "Последние недели" : "Recent weeks"}
          timeseries={trendData}
          drivers={drivers}
          ctaLabel={isRu ? "Проанализировать вовлечённость" : "Analyze engagement"}
          locale={locale}
          periodFrom={periodFrom}
          periodTo={periodTo}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {isRu ? "AI инсайт" : "AI insight"}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>{isRu ? "• Нагрузка растёт в начале недели — планируйте фокус-блоки утром." : "• Load spikes early week — block morning focus time."}</li>
            <li>{isRu ? "• Поддержка и признание держатся на хорошем уровне." : "• Support and recognition stay healthy."}</li>
            <li>{isRu ? "• Проверьте баланс задач к четвергу, чтобы не уходить в переработки." : "• Rebalance tasks by Thu to avoid spillover."}</li>
          </ul>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {isRu ? "AI сгенерировано" : "AI generated"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {isRu ? "Фокус недели" : "Your focus this week"}
            </p>
          </div>
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">
                {isRu ? "Сократить шум митингов" : "Reduce meeting noise"}
              </p>
              <p className="text-xs text-slate-600">
                {isRu ? "Сгруппируйте встречи и оставьте два фокус-блока без звонков." : "Group meetings and keep two focus blocks meeting-free."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">
                {isRu ? "Уточнить 3 приоритета недели" : "Align 3 weekly priorities"}
              </p>
              <p className="text-xs text-slate-600">
                {isRu ? "Зафиксируйте результаты недели и обсудите их с менеджером." : "Lock 3 outcomes and review with your manager."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-inner">
              <p className="text-sm font-semibold text-slate-900">
                {isRu ? "Поддержка при перегрузке" : "Support when overloaded"}
              </p>
              <p className="text-xs text-slate-600">
                {isRu ? "Если задачи копятся, попросите перераспределение или буфер." : "If work piles up, ask to rebalance or add buffer."}
              </p>
            </div>
          </div>
        </div>
      </section>

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
                const duration = run.finishedAt.getTime() - run.startedAt.getTime();
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
