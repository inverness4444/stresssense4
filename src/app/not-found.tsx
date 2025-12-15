export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">We couldn&apos;t find this page</h1>
        <p className="mt-2 text-sm text-slate-600">Check the URL or head back to the homepage.</p>
        <a
          href="/"
          className="mt-4 inline-flex rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
        >
          Back to homepage
        </a>
      </div>
    </div>
  );
}
