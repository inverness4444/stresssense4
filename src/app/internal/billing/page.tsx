import { prisma } from "@/lib/prisma";

export default async function InternalBillingPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { organization: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Billing console</h1>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {invoices.map((inv: any) => (
          <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-semibold text-slate-900">
                {inv.number ?? inv.stripeInvoiceId ?? inv.id} · {inv.organization.name}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(inv.createdAt).toLocaleDateString()} · {inv.status} · ${(inv.amountCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
        {invoices.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No invoices found.</p>}
      </div>
    </div>
  );
}
