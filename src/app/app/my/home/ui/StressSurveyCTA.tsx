"use client";

import type { Locale } from "@/lib/i18n";

export function StressSurveyCTA({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isRu ? "StressSense" : "StressSense"}
          </p>
          <h3 className="text-sm font-semibold text-slate-900">{isRu ? "Стресс-опрос" : "Stress pulse"}</h3>
          <p className="text-sm text-slate-600">
            {isRu
              ? "Опрос только про рабочий стресс и нагрузку. Ответы локальные для демо."
              : "Pulse about work stress and workload. Local-only for demo."}
          </p>
        </div>
      </div>
    </div>
  );
}
