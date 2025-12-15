import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InstalledAppsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in.</p>
      </div>
    );
  }

  const installs = await prisma.marketplaceInstallation.findMany({
    where: { organizationId: user.organizationId },
    include: { app: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Installed apps</p>
        <h1 className="text-2xl font-semibold text-slate-900">Extensions in your workspace</h1>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {installs.map((inst) => (
          <div key={inst.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{inst.app.name}</p>
              <p className="text-xs text-slate-500">Status: {inst.status}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/app/marketplace/${inst.app.slug}`} className="text-primary hover:underline">
                Details
              </Link>
            </div>
          </div>
        ))}
        {installs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No apps installed.</p>}
      </div>
    </div>
  );
}
