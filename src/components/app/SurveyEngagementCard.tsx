"use client";

import { useEffect, useState } from "react";
import { EngagementGauge } from "./EngagementGauge";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TimeseriesPoint = { date: string; score: number };
type Report = {
  score: number;
  delta: number;
  deltaDirection: "up" | "down";
  responsesCount: number;
  periodLabel: string;
  timeseries: TimeseriesPoint[];
  drivers: string[];
  summary?: string;
  actions?: string[];
};

export function SurveyEngagementCard({
  orgId,
  teamId,
  surveyId,
  locale = "en",
}: {
  orgId: string;
  teamId?: string;
  surveyId?: string;
  locale?: "en" | "ru";
}) {
  const isRu = locale === "ru";
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = !data && !error;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/app/api/surveys/engagement-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, teamId, surveyId }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? null);
          setData(json.data ?? null);
          return;
        }
        setData(json.data);
      } catch (e) {
        // fall back to sample if route fails
        setError(null);
      }
    };
    load();
  }, [orgId, teamId, surveyId]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-100/60 bg-gradient-to-r from-indigo-50 via-white to-secondary/10 p-6 shadow-xl">
      <div className="absolute left-6 top-4 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute right-6 bottom-4 h-24 w-24 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {isRu ? "Отчёт по опросу" : "Survey report"}
          </p>
          <p className="text-sm text-slate-500">{data?.periodLabel ?? (isRu ? "Превью" : "Live preview")}</p>
        </div>
        <button className="text-sm font-semibold text-primary hover:text-primary-strong">
          {isRu ? "Анализ вовлечённости" : "Analyse engagement"}
        </button>
      </div>

      {loading && (
        <div className="mt-4 animate-pulse space-y-3 rounded-2xl border border-white/60 bg-white/60 p-5">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-32 rounded bg-slate-100" />
        </div>
      )}

      {!loading && data && (
        <>
          <div className="mt-4 grid gap-6 md:grid-cols-[240px_1fr] md:items-center">
            <div className="relative flex flex-col items-start gap-2">
              <EngagementGauge score={data.score} />
              <div className="text-sm font-semibold text-slate-900">
                {isRu ? "Индекс вовлечённости" : "Engagement score"}
              </div>
              <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.deltaDirection === "up" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {data.deltaDirection === "up" ? "↑" : "↓"} {Math.abs(data.delta).toFixed(1)}pt
                </span>
                <span className="text-slate-500">
                  {data.responsesCount} {isRu ? "ответов" : "responses"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-emerald-600">
                {data.deltaDirection === "up" ? (isRu ? "Отлично!" : "Amazing!") : (isRu ? "Нужно внимание" : "Needs attention")}
              </p>
              <button className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.02]">
                ✦ {isRu ? "Анализ вовлечённости" : "Analyse engagement"}
              </button>
            </div>

            <div className="h-56 w-full rounded-2xl border border-white/60 bg-white/70 p-3 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeseries}>
                  <defs>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fill="url(#colorEngagement)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {isRu ? "AI инсайт" : "AI insight"}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {data.summary ??
                  (isRu
                    ? "Вовлечённость выросла; признание и поддержка менеджера — ключевые факторы. Следите за нагрузкой."
                    : "Engagement grew by 0.6 points; recognition and manager support are key drivers. Keep an eye on workload.")}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {isRu ? "Сгенерировано AI" : "AI generated"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {isRu ? "Ваш фокус" : "Your focus"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(data.drivers?.length ? data.drivers : ["recognition", "manager_support", "workload"]).map((d) => (
                  <span key={d} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {d.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {(data.actions ?? [
                  "Run 1:1s with overloaded teams",
                  "Launch a recognition shoutout",
                  "Reprioritize Q2 workload",
                ]).map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-primary">•</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error === "insufficient_sample" ? "Недостаточно ответов для безопасной статистики" : error}
        </div>
      )}
    </div>
  );
}
