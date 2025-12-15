export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">This page doesn&apos;t exist in your workspace</h1>
      <p className="mt-2 text-sm text-slate-600">Maybe the link is outdated. Return to your overview.</p>
      <a
        href="/app/overview"
        className="mt-4 inline-flex rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
      >
        Go to overview
      </a>
    </div>
  );
}
