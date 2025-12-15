export default function ExperimentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Experiments</h1>
      <p className="text-sm text-slate-600">Manage A/B tests and ML trials. Connect to new Experiment models later.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Placeholder list. Wire to Experiment/Variant/Exposure/Metric events.</p>
      </div>
    </div>
  );
}
