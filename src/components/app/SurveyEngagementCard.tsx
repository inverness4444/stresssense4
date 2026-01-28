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

type NudgeCard = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  level: "Calm" | "Watch" | "UnderPressure" | "AtRisk";
  effort?: string;
  impact?: string;
  status: "todo" | "planned" | "done" | "snoozed";
};

type PlaybookView = {
  id: string;
  title: string;
  summary: string;
  steps: { label: string; detail?: string }[];
  recommendedTags?: string[];
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
  const [mounted, setMounted] = useState(false);
  const [nudges, setNudges] = useState<NudgeCard[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookView[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookView | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const loading = !data && !error;

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const loadNudges = async () => {
      try {
        const res = await fetch("/app/api/nudges/manager");
        const json = await res.json();
        if (res.ok) {
          const items: NudgeCard[] = (json.nudges ?? []).map((n: any) => ({
            id: n.id,
            title: n.template?.title ?? n.title ?? "Action",
            description: n.template?.description ?? n.notes,
            tags: n.tags ?? n.template?.triggerTags ?? [],
            level: n.level ?? n.template?.triggerLevel ?? "Watch",
            effort: n.template?.estimatedEffort,
            impact: n.template?.estimatedImpact,
            status: n.status,
          }));
          setNudges(items.slice(0, 3));
          setPlaybooks((json.playbooks ?? []) as PlaybookView[]);
        }
      } catch (e) {
        // silent fallback
      }
    };
    loadNudges();
  }, []);

  const updateStatus = async (id: string, status: "done" | "snoozed") => {
    setNudges((prev) => prev.filter((n) => n.id !== id));
    await fetch("/app/api/nudges/manager", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  };

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
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
              ) : (
                <div className="h-full w-full" />
              )}
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {isRu ? "Ваш фокус этой недели" : "Your focus this week"}
                  </p>
                  <p className="text-xs text-slate-500">{isRu ? "Основано на результатах стресса команд" : "Based on recent team stress results"}</p>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {nudges.length === 0 && (
                  <p className="text-sm text-slate-600">
                    {(data.actions ?? []).length === 0
                      ? isRu
                        ? "Нет активных подсказок — запустите pulse, чтобы получить действия."
                        : "No active nudges — run a pulse to get actions."
                      : (data.actions ?? []).slice(0, 3).join(", ")}
                  </p>
                )}
                {nudges.map((nudge) => {
                  const tone =
                    nudge.level === "AtRisk"
                      ? "bg-rose-100 text-rose-700"
                      : nudge.level === "UnderPressure"
                        ? "bg-orange-100 text-orange-700"
                        : nudge.level === "Watch"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700";
                  return (
                    <div key={nudge.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{nudge.level}</span>
                            {nudge.effort && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Effort: {nudge.effort}</span>}
                            {nudge.impact && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Impact: {nudge.impact}</span>}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{nudge.title}</p>
                          {nudge.description && <p className="text-xs text-slate-600">{nudge.description}</p>}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {nudge.tags.map((t) => (
                              <span key={t} className="rounded-full bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => updateStatus(nudge.id, "done")}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            ✓ {isRu ? "Готово" : "Mark as done"}
                          </button>
                          <button
                            onClick={() => updateStatus(nudge.id, "snoozed")}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                          >
                            {isRu ? "Отложить" : "Snooze"}
                          </button>
                          <button
                            onClick={() => {
                              const match = playbooks.find((p) => p.recommendedTags?.some((t) => nudge.tags.includes(t)));
                              setSelectedPlaybook(match ?? playbooks[0] ?? null);
                            }}
                            className="text-xs font-semibold text-primary hover:text-primary-strong"
                          >
                            {isRu ? "Открыть playbook" : "View playbook"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      {selectedPlaybook && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="max-w-lg w-full rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Playbook</p>
                <h3 className="text-lg font-semibold text-slate-900">{selectedPlaybook.title}</h3>
                <p className="text-sm text-slate-600">{selectedPlaybook.summary}</p>
              </div>
              <button onClick={() => setSelectedPlaybook(null)} className="text-sm text-slate-500 hover:text-slate-800">
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {selectedPlaybook.steps.map((s) => (
                <label key={s.label} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checkedSteps[s.label] ?? false}
                    onChange={() => setCheckedSteps((prev) => ({ ...prev, [s.label]: !prev[s.label] }))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                    {s.detail && <p className="text-xs text-slate-600">{s.detail}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
