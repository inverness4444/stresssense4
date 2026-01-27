import { getCurrentUser } from "@/lib/auth";
import { getMyHomeData } from "../actions";
import MyHomeClient from "./ui/MyHomeClient";
import { getLocale } from "@/lib/i18n-server";
import { getBillingGateStatus } from "@/lib/billingGate";
import { env } from "@/config/env";

export default async function MyHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Пожалуйста, войдите.</div>;
  }
  const data = await getMyHomeData();
  const locale = await getLocale();
  const orgCreatedAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : new Date();
  const gateStatus = await getBillingGateStatus(user.organizationId, orgCreatedAt, { userRole: user.role });
  return (
    <MyHomeClient
      data={data}
      userName={user.name ?? ""}
      userId={user.id}
      locale={locale}
      aiEnabled={gateStatus.hasPaidAccess || env.isDev}
    />
  );
}
