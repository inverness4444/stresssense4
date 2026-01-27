"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Line } from "recharts";
import { t, type Locale } from "@/lib/i18n";

export type TrendPoint = { label: string; value: number; date?: string | number | Date };

type Props = {
  scope: "team" | "employee";
  title: string;
  score: number;
  delta: number;
  trendLabel: string;
  participation?: number;
  data: TrendPoint[];
  locale?: Locale;
  showOverlay?: boolean;
};

export function EngagementTrendCard({ scope, title, score, delta, trendLabel, participation, data, locale = "en", showOverlay = true }: Props) {
  const isRu = locale === "ru";
  const hasData = data.length > 0;
  const chartData = hasData ? data : [{ label: isRu ? "Нет данных" : "No data", value: 0 }];
  const values = chartData.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const deltaPositive = delta > 0;
  const deltaZero = delta === 0;
  const overlayTone = deltaPositive
    ? "text-emerald-600 bg-emerald-50 ring-emerald-200"
    : deltaZero
      ? "text-slate-600 bg-slate-50 ring-slate-200"
      : "text-red-600 bg-red-50 ring-red-200";
  const gaugePercent = Math.min(1, Math.max(0, score / 10));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f3f4ff] via-white to-[#eef9ff] p-6 shadow-xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/10">
            {scope === "team" ? t(locale, "trendBadgeTeam") : t(locale, "trendBadgeEmployee")}
          </span>
          <span className="text-slate-800">{title}</span>
        </div>
        <button className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
          {t(locale, "trendViewDetails")}
        </button>
      </div>

      <div className="relative mt-5 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
            <defs>
              <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#475569" }} />
            <YAxis hide domain={hasData ? [minValue - 0.5, maxValue + 0.5] : [0, 10]} />
            <Tooltip
              formatter={(val: number) => `${val.toFixed(1)} / 10`}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.07)" }}
            />
            <Area type="monotone" dataKey="value" stroke="#4F46E5" fillOpacity={1} fill="url(#engagementGradient)" strokeWidth={2.5} />
            <Line type="monotone" dataKey="value" stroke="#4338CA" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#4F46E5" }} />
          </AreaChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-3 left-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t(locale, "trendMonthsSprints")}</div>
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-500">
              {isRu ? "Нет данных" : "No data yet"}
            </div>
          )}
        </div>

        {showOverlay && (
          <div className="absolute -top-6 left-4 w-[240px] rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{scope === "team" ? t(locale, "trendEngagementScore") : t(locale, "trendEngagementIndex")}</span>
              {participation !== undefined && <span className="text-slate-600">{t(locale, "trendParticipation")}: {participation}%</span>}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-slate-900">{score.toFixed(1)}</span>
                  <span className="text-sm font-semibold text-slate-500">/10</span>
                </div>
                <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${overlayTone}`}>
                  {delta > 0 ? "↑" : delta < 0 ? "↓" : "•"} {Math.abs(delta).toFixed(1)} pt
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{trendLabel}</p>
              </div>
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full bg-slate-100" />
                <svg className="absolute inset-0 h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${(gaugePercent * 100).toFixed(1)}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">{(gaugePercent * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
