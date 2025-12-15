"use client";

import Link from "next/link";
import { getTeamStatus, teamStatusMeta } from "@/lib/statusLogic";

export default function AdminSurveysPage() {
  // Demo stub: data loading is disabled
  const runs: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Опросы</p>
          <h2 className="text-2xl font-semibold text-slate-900">Запуски pulse-опросов</h2>
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
              <th className="px-4 py-3">Опрос</th>
              <th className="px-4 py-3">Команда</th>
              <th className="px-4 py-3">Запуск</th>
              <th className="px-4 py-3">Completion</th>
              <th className="px-4 py-3">Stress</th>
              <th className="px-4 py-3">Engagement</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {runs.map((run) => {
              const status = getTeamStatus(run.avgStressIndex ?? 5, run.avgEngagementScore ?? 6, (run.completedCount / (run.targetCount || 1)) * 100);
              const meta = teamStatusMeta[status];
              return (
                <tr key={run.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{run.title}</div>
                    <div className="text-xs text-slate-500">Template: {run.templateId}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{"Вся организация"}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(run.launchedAt).toLocaleDateString("ru-RU")}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {run.completedCount}/{run.targetCount}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{run.avgStressIndex?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{run.avgEngagementScore?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ring-1 ${
                        meta.tone === "emerald"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : meta.tone === "amber"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : meta.tone === "orange"
                              ? "bg-orange-50 text-orange-700 ring-orange-200"
                              : "bg-rose-50 text-rose-700 ring-rose-200"
                      }`}
                    >
                      {meta.badge}
                    </span>
                  </td>
                </tr>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td className="px-4 py-5 text-sm text-slate-600" colSpan={7}>
                  Пока нет запусков. Попробуйте отправить первый pulse для команды Продукт из раздела «Команды».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
