export default function TeamStressLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-72 rounded bg-slate-200 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-3 h-10 rounded-xl bg-slate-100 animate-pulse last:mb-0" />
        ))}
      </div>
    </div>
  );
}
