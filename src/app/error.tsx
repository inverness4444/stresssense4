'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Error</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Something went wrong on our side</h1>
        <p className="mt-2 text-sm text-slate-600">Try again or contact support if the issue persists.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
