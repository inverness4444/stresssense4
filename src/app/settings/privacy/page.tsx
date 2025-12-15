export default function UserPrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Privacy & data</h1>
      <p className="text-sm text-slate-600">
        Manage how your data is used in StressSense. This is a simplified placeholder; connect it to real preferences later.
      </p>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Consents & preferences</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Aggregated analytics (toggle)</li>
          <li>AI coach usage sharing (toggle)</li>
          <li>Wellbeing tips emails (toggle)</li>
        </ul>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Data subject requests</p>
        <p className="text-sm text-slate-600">Download your data or request deletion.</p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">Download my data</button>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">Request deletion</button>
        </div>
      </div>
    </div>
  );
}
