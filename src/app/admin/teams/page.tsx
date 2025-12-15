"use client";

import Link from "next/link";
import { teamStatusMeta } from "@/lib/statusLogic";

export default function AdminTeamsPage() {
  const teams: any[] = [];

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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
        Список команд недоступен в этой демо-сборке. Запустите приложение в полноценной среде с БД, чтобы увидеть реальные команды.
      </div>
    </div>
  );
}
