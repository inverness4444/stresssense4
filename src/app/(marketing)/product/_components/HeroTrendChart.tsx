"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TrendPoint = { label: string; value: number };

type HeroTrendChartProps = {
  data: TrendPoint[];
  className?: string;
};

export default function HeroTrendChart({ data, className }: HeroTrendChartProps) {
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = Math.max(0, Math.floor((min - 0.6) * 10) / 10);
  const yMax = Math.min(10, Math.ceil((max + 0.6) * 10) / 10);
  const containerClass = `h-64 w-full ${className ?? ""}`;

  return (
    <div className={containerClass}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="heroTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6b7bff" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6b7bff" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", backgroundColor: "#ffffff", fontSize: 12 }}
            labelStyle={{ color: "#0f172a", fontWeight: 600 }}
            itemStyle={{ color: "#0f172a" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5b6cf8"
            strokeWidth={3}
            fill="url(#heroTrendGradient)"
            dot={{ r: 3, stroke: "#5b6cf8", strokeWidth: 2, fill: "#ffffff" }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
