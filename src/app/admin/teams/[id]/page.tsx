"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMembersByTeam, getTeamById } from "@/lib/orgData";
import { teamStatusMeta } from "@/lib/statusLogic";
import { EngagementTrendCard } from "@/components/EngagementTrendCard";

export default function AdminTeamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;
  const team = useMemo(() => getTeamById(teamId), [teamId]);
  const members = useMemo(() => (team ? getMembersByTeam(team.id) : []), [team]);

  if (!team) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Команда не найдена</p>
          <p className="text-sm text-slate-600">Проверьте ссылку или вернитесь назад.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = teamStatusMeta[team.status];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Команда</p>
          <h1 className="text-3xl font-bold text-slate-900">{team.name}</h1>
          <p className="text-sm text-slate-600">Членов: {team.memberCount} · Последний pulse: {team.lastPulseAt ? new Date(team.lastPulseAt).toLocaleDateString("ru-RU") : "—"}</p>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-primary/50 hover:text-primary"
        >
          Назад к командам
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Состояние</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{statusMeta.label}</h3>
              <p className="text-sm text-slate-600">{statusMeta.ai}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ring-1 ${
                statusMeta.tone === "emerald"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : statusMeta.tone === "amber"
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : statusMeta.tone === "orange"
                      ? "bg-orange-50 text-orange-700 ring-orange-200"
                      : "bg-rose-50 text-rose-700 ring-rose-200"
              }`}
            >
              {statusMeta.badge}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <dt className="text-slate-500">Stress index</dt>
              <dd className="text-lg font-semibold text-slate-900">{team.stressIndex.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Engagement</dt>
              <dd className="text-lg font-semibold text-slate-900">{team.engagementScore.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Participation</dt>
              <dd className="text-lg font-semibold text-slate-900">{team.participation}%</dd>
            </div>
            <div>
              <dt className="text-slate-500">Теги</dt>
              <dd className="flex flex-wrap gap-2">
                {team.topTags.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <EngagementTrendCard
          scope="team"
          title="Динамика вовлечённости"
          score={team.engagementScore}
          delta={(team.engagementScore ?? 0) - ((team.trend?.[0]?.value ?? team.engagementScore) || 0)}
          trendLabel="за последние месяцы"
          participation={team.participation}
          data={(team.trend ?? []).map((p) => ({ label: p.label, value: p.value }))}
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Участники</p>
            <h3 className="text-lg font-semibold text-slate-900">Люди в команде</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {members.length} человек
          </span>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{m.role}</span>
                {m.wellbeing !== undefined && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    wellbeing {m.wellbeing.toFixed(1)}
                  </span>
                )}
                {m.engagementScore !== undefined && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    engagement {m.engagementScore.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
