export default function OrgPrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Org privacy controls</h1>
      <p className="text-sm text-slate-600">
        Configure privacy defaults for your workspace. Hook this page to OrgPrivacySettings and AuditLog.
      </p>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Aggregation & thresholds</p>
        <p className="text-sm text-slate-600">Minimum responses, benchmarking participation, coach availability.</p>
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">AI & data region</p>
        <p className="text-sm text-slate-600">Choose whether to use third-party AI providers and what data region applies.</p>
      </div>
    </div>
  );
}
