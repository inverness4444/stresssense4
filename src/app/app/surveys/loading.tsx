export default function SurveysLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-full max-w-md rounded-full bg-slate-100 animate-pulse" />
        <div className="h-10 w-32 rounded-full bg-slate-100 animate-pulse" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mb-3 h-10 rounded-xl bg-slate-100 animate-pulse last:mb-0" />
        ))}
      </div>
    </div>
  );
}
