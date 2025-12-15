type Props = { score: number; max?: number };

export function EngagementGauge({ score, max = 10 }: Props) {
  const pct = Math.max(0, Math.min(score / max, 1));
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - pct);
  const color = pct >= 0.7 ? "#22c55e" : pct >= 0.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 120 120" className="h-28 w-28">
        <circle cx="60" cy="60" r="45" stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r="45"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-slate-900">{score.toFixed(1)}</span>
        <span className="text-xs font-medium text-slate-500">/10</span>
      </div>
    </div>
  );
}
