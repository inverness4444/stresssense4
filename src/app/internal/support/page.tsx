import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function InternalSupport() {
  const orgs = await prisma.organization.findMany({
    take: 10,
    orderBy: { updatedAt: "desc" },
    include: { subscription: true, dunningState: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Support console</h1>
      <div className="rounded-2xl border border-slate-200 bg-white">
        {orgs.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <div>
              <p className="font-semibold text-slate-900">{o.name}</p>
              <p className="text-xs text-slate-500">
                Stage: {o.lifecycleStage ?? "n/a"} · Billing: per-seat · Seats: {o.subscription?.seats ?? "—"} · Status: {o.subscription?.status ?? "none"}
              </p>
              {o.dunningState && <p className="text-xs text-amber-700">Dunning: {o.dunningState.status}</p>}
            </div>
            <Link href={`/internal/organizations/${o.id}`} className="text-primary hover:underline">
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
