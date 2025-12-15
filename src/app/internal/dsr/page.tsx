export default function DsrAdminPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Data subject requests</h1>
      <p className="text-sm text-slate-600">Monitor and handle export/erasure requests. Wire to DataSubjectRequest + jobs later.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">No requests loaded in this placeholder.</p>
      </div>
    </div>
  );
}
