"use client";

import Link from "next/link";
import { getOrganizationBySlug, getTeamsByOrg } from "@/lib/orgData";
import { teamStatusMeta } from "@/lib/statusLogic";

export default function AdminTeamsPage() {
  const org = getOrganizationBySlug("nova-bank");
  const teams = org ? getTeamsByOrg(org.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Команды</p>
          <h2 className="text-2xl font-semibold text-slate-900">Все команды организации</h2>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-primary/50 hover:text-primary"
        >
          Обзор
        </Link>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Команда</th>
              <th className="px-4 py-3">Участники</th>
              <th className="px-4 py-3">Stress</th>
              <th className="px-4 py-3">Engagement</th>
              <th className="px-4 py-3">Participation</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Pulse</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {teams.map((t) => {
              const status = teamStatusMeta[t.status];
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link href={`/admin/teams/${t.id}`} className="hover:text-primary">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{t.memberCount}</td>
                  <td className="px-4 py-3 text-slate-700">{t.stressIndex.toFixed(1)}</td>
                  <td className="px-4 py-3 text-slate-700">{t.engagementScore.toFixed(1)}</td>
                  <td className="px-4 py-3 text-slate-700">{t.participation}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ring-1 ${
                        status.tone === "emerald"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : status.tone === "amber"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : status.tone === "orange"
                              ? "bg-orange-50 text-orange-700 ring-orange-200"
                              : "bg-rose-50 text-rose-700 ring-rose-200"
                      }`}
                    >
                      {status.badge}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.lastPulseAt ? new Date(t.lastPulseAt).toLocaleDateString("ru-RU") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
