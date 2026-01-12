"use client";

import type { StressDriver } from "@/lib/aiStressDrivers";

type StressDriversGridProps = {
  drivers: StressDriver[];
  title: string;
  subtitle: string;
  emptyMessage?: string;
};

export function StressDriversGrid({ drivers, title, subtitle }: StressDriversGridProps) {
  const hasDrivers = drivers.length > 0;

  if (!hasDrivers) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {drivers.map((driver) => (
          <div key={driver.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{driver.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{driver.score.toFixed(1)}</p>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
              <DeltaBadge delta={driver.delta} />
            </div>
            <p className="mt-2 text-xs text-slate-600">{driver.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <ArrowUpIcon className="h-3 w-3" />
        +{Math.abs(delta).toFixed(1)} pt
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-600">
        <ArrowDownIcon className="h-3 w-3" />
        -{Math.abs(delta).toFixed(1)} pt
      </span>
    );
  }
  return <span className="text-slate-500">0.0 pt</span>;
}

function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l6 6M12 5l-6 6M12 5v14" />
    </svg>
  );
}

function ArrowDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l6-6M12 19l-6-6M12 19V5" />
    </svg>
  );
}
