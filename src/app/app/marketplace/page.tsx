import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Please sign in to browse the marketplace.</p>
      </div>
    );
  }

  const apps = await prisma.marketplaceApp.findMany({
    where: { isPublished: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Marketplace</p>
          <h1 className="text-2xl font-semibold text-slate-900">Extensions & content packs</h1>
          <p className="text-sm text-slate-600">Install packs, automations and integrations for your workspace.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {apps.map((app: any) => (
          <Link
            key={app.id}
            href={`/app/marketplace/${app.slug}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{app.category}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {app.listingType === "third_party" ? "Partner" : "First-party"}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{app.name}</h3>
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{app.description}</p>
          </Link>
        ))}
        {apps.length === 0 && <p className="text-sm text-slate-600">No apps published yet.</p>}
      </div>
    </div>
  );
}
