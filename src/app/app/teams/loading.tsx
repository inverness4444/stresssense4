export default function TeamsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-40 rounded bg-slate-200 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-3 h-10 rounded-xl bg-slate-100 animate-pulse last:mb-0" />
        ))}
      </div>
    </div>
  );
}
