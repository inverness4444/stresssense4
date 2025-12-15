export default function SurveyDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="h-7 w-64 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-9 w-28 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}
