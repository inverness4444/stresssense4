'use client';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Workspace error</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Something went wrong on our side</h1>
      <p className="mt-2 text-sm text-slate-600">Please try again. If it keeps happening, reach out to support.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-2 text-sm font-semibold text-white shadow-sm"
      >
        Retry
      </button>
    </div>
  );
}
