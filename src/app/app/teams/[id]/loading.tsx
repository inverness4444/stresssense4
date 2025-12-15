export default function TeamLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-64 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-80 rounded bg-slate-200 animate-pulse" />
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-3 h-12 rounded-xl bg-slate-100 animate-pulse last:mb-0" />
        ))}
      </div>
    </div>
  );
}
