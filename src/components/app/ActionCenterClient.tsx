"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type NudgeUi = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  level: "Calm" | "Watch" | "UnderPressure" | "AtRisk";
  status: "todo" | "planned" | "done" | "snoozed";
  effort?: string;
  impact?: string;
  teamId: string;
  createdAt: string;
  dueAt?: string | null;
};

type PlaybookUi = {
  id: string;
  title: string;
  summary: string;
  recommendedTags?: string[];
  steps: { label: string; detail?: string }[];
};

type TeamOption = { id: string; name: string };

export function ActionCenterClient({ teams, defaultTeamId }: { teams: TeamOption[]; defaultTeamId?: string }) {
  const [nudges, setNudges] = useState<NudgeUi[]>([]);
  const [playbooks, setPlaybooks] = useState<PlaybookUi[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>(defaultTeamId ?? "all");
  const [statusFilter, setStatusFilter] = useState<"todo" | "planned" | "snoozed" | "all">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "Watch" | "UnderPressure" | "AtRisk">("all");
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookUi | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/app/api/nudges/manager");
      const json = await res.json();
      if (res.ok) {
        setNudges(
          (json.nudges ?? []).map((n: any) => ({
            id: n.id,
            title: n.template?.title ?? n.title,
            description: n.template?.description ?? n.description,
            tags: n.tags ?? n.template?.triggerTags ?? [],
            level: n.level ?? n.template?.triggerLevel ?? "Watch",
            status: n.status,
            effort: n.template?.estimatedEffort,
            impact: n.template?.estimatedImpact,
            teamId: n.teamId,
            createdAt: n.createdAt,
            dueAt: n.dueAt,
          }))
        );
        setPlaybooks(json.playbooks ?? []);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return nudges.filter((n) => {
      const byTeam = selectedTeam === "all" ? true : n.teamId === selectedTeam;
      const byStatus = statusFilter === "all" ? true : n.status === statusFilter;
      const byLevel = levelFilter === "all" ? true : n.level === levelFilter;
      return byTeam && byStatus && byLevel;
    });
  }, [nudges, selectedTeam, statusFilter, levelFilter]);

  const updateStatus = (id: string, status: "done" | "snoozed") => {
    startTransition(() => {
      setNudges((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)));
      void fetch("/app/api/nudges/manager", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    });
  };

  const openTodos = nudges.filter((n) => n.status === "todo");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Action center</p>
          <h2 className="text-xl font-semibold text-slate-900">Действия по стрессу</h2>
          <p className="text-sm text-slate-600">Мы собрали действия на основе последних опросов стресса — начните с At risk команд.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Все команды</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">Все статусы</option>
            <option value="todo">Todo</option>
            <option value="planned">Planned</option>
            <option value="snoozed">Snoozed</option>
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as any)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">Все уровни</option>
            <option value="Watch">Watch</option>
            <option value="UnderPressure">Under pressure</option>
            <option value="AtRisk">At risk</option>
          </select>
        </div>
      </div>

      {openTodos.length === 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          🎉 Вы закрыли все текущие действия для выбранной команды. Новые появятся после следующего опроса стресса.
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-slate-600">Нет активных действий. Запустите pulse или дождитесь новых данных.</p>}
        {filtered.map((n) => {
          const tone =
            n.level === "AtRisk"
              ? "bg-rose-100 text-rose-700"
              : n.level === "UnderPressure"
                ? "bg-orange-100 text-orange-700"
                : "bg-amber-100 text-amber-700";
          return (
            <div key={n.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{n.level}</span>
                  {n.effort && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Effort: {n.effort}</span>}
                  {n.impact && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Impact: {n.impact}</span>}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {teams.find((t) => t.id === n.teamId)?.name ?? "Team"}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                {n.description && <p className="text-xs text-slate-600">{n.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={isPending}
                  onClick={() => updateStatus(n.id, "done")}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                >
                  Done
                </button>
                <button
                  disabled={isPending}
                  onClick={() => updateStatus(n.id, "snoozed")}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Snooze
                </button>
                <button
                  onClick={() => {
                    const match = playbooks.find((p) => p.recommendedTags?.some((t) => n.tags.includes(t)));
                    setSelectedPlaybook(match ?? playbooks[0] ?? null);
                  }}
                  className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
                >
                  View playbook
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPlaybook && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
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
