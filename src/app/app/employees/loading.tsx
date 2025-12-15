export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-80 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-64 rounded-full bg-slate-100 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-10 w-28 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mb-3 h-12 rounded-xl bg-slate-100 animate-pulse last:mb-0" />
        ))}
      </div>
    </div>
  );
}
