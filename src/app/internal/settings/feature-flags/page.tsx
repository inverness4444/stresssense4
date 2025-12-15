import { prisma } from "@/lib/prisma";

export default async function FeatureFlagsPage() {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { createdAt: "desc" },
    include: { overrides: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Feature flags</h1>
      <p className="text-sm text-slate-600">Manage defaults and overrides.</p>
      <div className="rounded-2xl border border-slate-200 bg-white">
        {flags.map((f: any) => (
          <div key={f.id} className="border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <p className="font-semibold text-slate-900">{f.key}</p>
            <p className="text-xs text-slate-500">{f.description}</p>
            <p className="text-xs text-slate-500">Default: {f.defaultEnabled ? "on" : "off"} · Overrides: {f.overrides.length}</p>
          </div>
        ))}
        {flags.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No flags configured.</p>}
      </div>
    </div>
  );
}
