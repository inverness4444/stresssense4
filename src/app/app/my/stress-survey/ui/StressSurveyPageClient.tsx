"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelfStressSurvey } from "@/components/app/SelfStressSurveyProvider";
import type { Locale } from "@/lib/i18n";

type HistoryItem = {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  score: number;
};

function formatDate(d: Date) {
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  if (mins <= 0) return `${secs} c`;
  return `${mins} мин ${secs.toString().padStart(2, "0")} c`;
}

export default function StressSurveyPageClient({ userName, userId, locale }: { userName: string; userId: string; locale: Locale }) {
  const { openSurvey } = useSelfStressSurvey();
  const isRu = locale === "ru";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const storagePrefix = useMemo(() => `stressSurvey:${userId || "local-user"}`, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(`${storagePrefix}:history`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HistoryItem[];
        setHistory(parsed);
      } catch {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [storagePrefix]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ average: number; answers: number[]; date: string; userId?: string }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      const finished = detail?.date ? new Date(detail.date) : new Date();
      const started = startedAt ?? finished;
      const durationMs = Math.max(0, finished.getTime() - started.getTime());
      const entry: HistoryItem = {
        id: `survey-${finished.getTime()}`,
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        durationMs,
        score: detail?.average ?? 0,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 20);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`${storagePrefix}:history`, JSON.stringify(next));
        }
        return next;
      });
      setStartedAt(null);
    };
    window.addEventListener("stress-survey-completed", handler as EventListener);
    return () => window.removeEventListener("stress-survey-completed", handler as EventListener);
  }, [startedAt, storagePrefix]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const lastEntry = history.find((h) => h.startedAt.slice(0, 10) === todayIso);

  const startSurvey = () => {
    if (lastEntry) return;
    setStartedAt(new Date());
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
            {isRu ? "Проходите опрос и следите за историей: старт, длительность, результат." : "Take the pulse and track start time, duration, and score."}
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
              {lastEntry
                ? isRu
                  ? `Пройден: ${formatDate(new Date(lastEntry.finishedAt))}, результат ${lastEntry.score.toFixed(1)} pt`
                  : `Taken: ${formatDate(new Date(lastEntry.finishedAt))}, score ${lastEntry.score.toFixed(1)} pt`
                : isRu
                  ? "Опрос ещё не пройден сегодня."
                  : "You haven’t taken today’s pulse."}
            </p>
          </div>
          <button
            onClick={startSurvey}
            disabled={!!lastEntry}
            className="rounded-full bg-gradient-to-r from-primary to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {lastEntry ? (isRu ? "Доступно завтра" : "Available tomorrow") : isRu ? "Пройти опрос" : "Start pulse"}
          </button>
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
              {history.map((run) => {
                const duration = run.durationMs;
                return (
                  <tr key={run.id} className="transition hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-sm text-slate-800">{formatDate(new Date(run.startedAt))}</td>
                    <td className="px-3 py-2 text-sm text-slate-800">{formatDuration(duration)}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">{run.score.toFixed(1)} pt</td>
                  </tr>
                );
              })}
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
