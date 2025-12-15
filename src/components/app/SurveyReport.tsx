"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";

type TrendDirection = "up" | "down" | "flat";

export type SurveyDriver = {
  name: string;
  score: number;
  delta?: number;
};

export type SurveyTimeseriesPoint = { label: string; value: number };

export type SurveyReportProps = {
  title?: string;
  subtitle?: string;
  score: number;
  delta?: number;
  deltaDirection?: TrendDirection;
  periodLabel?: string;
  timeseries: SurveyTimeseriesPoint[];
  drivers?: SurveyDriver[];
  ctaLabel?: string;
  onCtaClick?: () => void;
};

function formatDelta(delta?: number, dir?: TrendDirection) {
  if (delta === undefined || dir === undefined) return { text: "--", color: "text-slate-500" };
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const color =
    dir === "up" ? "text-emerald-600" : dir === "down" ? "text-amber-600" : "text-slate-500";
  return { text: `${arrow} ${Math.abs(delta).toFixed(1)} pt`, color };
}

function statusLabel(score: number) {
  if (score > 7.5) return { text: "Healthy", color: "text-emerald-700" };
  if (score >= 6) return { text: "Watch zone", color: "text-amber-600" };
  return { text: "Needs attention", color: "text-rose-600" };
}

export function SurveyReport({
  title = "Survey report",
  subtitle = "Live preview",
  score,
  delta = 0,
  deltaDirection = "flat",
  periodLabel = "Last 6 weeks",
  timeseries,
  drivers = [],
  ctaLabel = "Analyze engagement",
  onCtaClick,
}: SurveyReportProps) {
  const [period, setPeriod] = useState<"30d" | "3m" | "6m">("6m");

  const normalizedSeries = useMemo(
    () => timeseries.map((t) => ({ ...t, value: Number((t.value ?? 0).toFixed(1)) })),
    [timeseries]
  );

  const donut = useMemo(() => {
    const radius = 64;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, score / 10));
    const offset = circumference * (1 - progress);
    return { radius, strokeWidth, circumference, offset };
  }, [score]);

  const deltaInfo = formatDelta(delta, deltaDirection);
  const status = statusLabel(score);

  const yMin =
    normalizedSeries.length > 0 ? Math.max(0, Math.min(...normalizedSeries.map((t) => t.value)) - 0.5) : 0;
  const yMax =
    normalizedSeries.length > 0 ? Math.max(...normalizedSeries.map((t) => t.value)) + 0.5 : 10;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
          {[
            { label: "30 days", key: "30d" as const },
            { label: "3 months", key: "3m" as const },
            { label: "6 months", key: "6m" as const },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={clsx(
                "rounded-full px-3 py-1 transition",
                period === opt.key ? "bg-white text-primary shadow-sm ring-1 ring-primary/30" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 px-6 pb-10 lg:grid-cols-[280px,1fr] lg:items-center">
        <div className="relative flex flex-col items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-inner">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg className="h-40 w-40 -rotate-90" viewBox="0 0 180 180">
              <defs>
                <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <circle
                cx="90"
                cy="90"
                r={donut.radius}
                stroke="#e5e7eb"
                strokeWidth={donut.strokeWidth}
                fill="none"
              />
              <circle
                cx="90"
                cy="90"
                r={donut.radius}
                stroke="url(#donutGradient)"
                strokeWidth={donut.strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${donut.circumference} ${donut.circumference}`}
                strokeDashoffset={donut.offset}
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold text-slate-900">{score.toFixed(1)}</span>
              <span className="text-xs font-semibold text-slate-500">/10</span>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <p className={clsx("font-semibold", status.color)}>{status.text}</p>
            <p className={clsx("flex items-center gap-2 text-xs font-semibold", deltaInfo.color)}>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {periodLabel}
              </span>
              {deltaInfo.text}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 shadow-inner">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={normalizedSeries}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorScore)"
                dot={{ r: 3 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {drivers.length > 0 && (
        <div className="border-t border-slate-100 bg-white/80 px-6 pb-6 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Drivers</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((driver) => {
              const driverDelta = driver.delta ?? 0;
              const driverDir: TrendDirection = driverDelta > 0 ? "up" : driverDelta < 0 ? "down" : "flat";
              const driverDeltaInfo = formatDelta(driverDelta, driverDir);
              return (
                <div
                  key={driver.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{driver.name}</p>
                    <span className="text-xs font-semibold text-slate-700">{driver.score.toFixed(1)}</span>
                  </div>
                  <p className={clsx("text-xs font-semibold", driverDeltaInfo.color)}>{driverDeltaInfo.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4">
        <button
          onClick={onCtaClick}
          className={clsx(
            "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-strong",
            !onCtaClick && "cursor-default opacity-60"
          )}
          type="button"
          disabled={!onCtaClick}
        >
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}
