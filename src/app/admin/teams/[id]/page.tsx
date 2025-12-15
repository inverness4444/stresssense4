"use client";

import Link from "next/link";

export default function AdminTeamDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Команда</p>
          <h2 className="text-2xl font-semibold text-slate-900">Команда {params?.id}</h2>
          <p className="text-sm text-slate-600">Демо-данные команды недоступны в этой сборке.</p>
        </div>
        <Link
          href="/admin/teams"
          className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-primary/50 hover:text-primary"
        >
          Все команды
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
        В демо-режиме страница команды показывает только заглушку. Запустите pulse-опросы и откройте Action center для актуальных данных.
      </div>
    </div>
  );
}
