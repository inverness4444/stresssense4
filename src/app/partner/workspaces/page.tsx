import Link from "next/link";
import { getPartnerUser } from "@/lib/partnerAuth";
import { prisma } from "@/lib/prisma";

export default async function PartnerWorkspacesPage() {
  const user = await getPartnerUser();
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Please <Link className="text-primary hover:underline" href="/partner/auth/signin">sign in</Link> to view your clients.
        </p>
      </div>
    );
  }

  const orgs = await prisma.partnerOrganization.findMany({
    where: { partnerId: user.partnerId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Client workspaces</h1>
        <p className="text-sm text-slate-600">Organizations linked to your partner account.</p>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {orgs.map((o) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{o.organization.name}</p>
              <p className="text-xs text-slate-500">
                Region: {o.organization.region} · Relationship: {o.relationshipType}
              </p>
            </div>
            <Link href={`/partner/workspaces/${o.organizationId}`} className="text-sm font-semibold text-primary hover:underline">
              View
            </Link>
          </div>
        ))}
        {orgs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No linked workspaces yet.</p>}
      </div>
    </div>
  );
}
