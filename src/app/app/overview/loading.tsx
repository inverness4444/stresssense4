export default function OverviewLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="mt-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
