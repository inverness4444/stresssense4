"use client";

import { useMemo } from "react";
import { useSelfStressSurvey } from "@/components/app/SelfStressSurveyProvider";
import type { Locale } from "@/lib/i18n";

type HistoryItem = {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  score: number;
};

type DailySurveySummary = {
  runId: string;
  title: string;
  dayIndex: number | null;
  source: string;
  runDate: string;
};

function formatDate(d: Date, locale: Locale) {
  return d.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number, locale: Locale) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  if (mins <= 0) return locale === "ru" ? `${secs} c` : `${secs}s`;
  return locale === "ru" ? `${mins} мин ${secs.toString().padStart(2, "0")} c` : `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export default function StressSurveyPageClient({
  userName,
  locale,
  todaySurvey,
  todayCompletedAt,
  todayScore,
  canStart,
  aiLocked,
  history,
}: {
  userName: string;
  locale: Locale;
  todaySurvey: DailySurveySummary | null;
  todayCompletedAt: string | null;
  todayScore: number | null;
  canStart: boolean;
  aiLocked: boolean;
  history: HistoryItem[];
}) {
  const { openSurvey } = useSelfStressSurvey();
  const isRu = locale === "ru";
  const lockedCopy = isRu
    ? "Опросы после 10-го дня доступны только при активной подписке."
    : "Daily AI surveys after day 10 are available only with an active subscription.";

  const startSurvey = () => {
    if (!canStart) return;
    openSurvey();
  };

  const streak = useMemo(() => {
    const daySet = new Set(
      history.map((h) => {
        const d = new Date(h.startedAt);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
      })
    );
    let s = 0;
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
        s += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    return s;
  }, [history]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
          <h1 className="text-2xl font-semibold text-slate-900">{isRu ? "Опросы" : "Surveys"}</h1>
          <p className="text-sm text-slate-600">
            {isRu ? "Ежедневные опросы и история ответов." : "Daily pulses and response history."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            <span>🔥</span>
            <span>{isRu ? `Серия: ${streak} дн.` : `Streak: ${streak} days`}</span>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{isRu ? "Сегодняшний опрос" : "Today’s pulse"}</p>
            <p className="text-sm text-slate-600">
              {todaySurvey ? (
                todayCompletedAt ? (
                  isRu
                    ? `Пройден: ${formatDate(new Date(todayCompletedAt), locale)}, результат ${Number(todayScore ?? 0).toFixed(1)} pt`
                    : `Taken: ${formatDate(new Date(todayCompletedAt), locale)}, score ${Number(todayScore ?? 0).toFixed(1)} pt`
                ) : (
                  isRu ? "Опрос ещё не пройден сегодня." : "You haven’t taken today’s pulse."
                )
              ) : (
                aiLocked ? lockedCopy : isRu ? "Опрос будет создан автоматически сегодня." : "Today’s survey will be generated automatically."
              )}
            </p>
            {todaySurvey && (
              <p className="text-xs text-slate-500">
                {isRu ? `Тема: ${todaySurvey.title}` : `Title: ${todaySurvey.title}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startSurvey}
              disabled={!canStart}
              className="rounded-full bg-gradient-to-r from-primary to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!canStart
                ? aiLocked
                  ? isRu
                    ? "Доступно после оплаты"
                    : "Available after payment"
                  : isRu
                    ? "Доступно позже"
                    : "Not available yet"
                : isRu
                  ? "Пройти опрос"
                  : "Start pulse"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{isRu ? "История" : "History"}</p>
            <p className="text-sm text-slate-600">{isRu ? "Начало, длительность и результат (pt)" : "Start time, duration, score (pt)"}</p>
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
              {history.map((run) => (
                <tr key={run.id} className="transition hover:bg-slate-50/80">
                  <td className="px-3 py-2 text-sm text-slate-800">{formatDate(new Date(run.startedAt), locale)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800">{formatDuration(run.durationMs, locale)}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-slate-900">{Number(run.score ?? 0).toFixed(1)} pt</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-sm text-slate-600">
                    {isRu ? "История появится после прохождения опроса." : "History will appear after you take a pulse."}
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
