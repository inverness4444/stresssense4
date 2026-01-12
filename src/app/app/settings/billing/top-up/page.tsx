import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getLocale } from "@/lib/i18n-server";
import TopUpClient from "./TopUpClient";

type SearchParams = { amount?: string };

export default async function BillingTopUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const orgId = user.organizationId;
  const enabled = await isFeatureEnabled("growth_module_v1", { organizationId: orgId, userId: user.id });
  const role = (user.role ?? "").toUpperCase();
  if (!enabled || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) redirect("/app/overview");

  const rawAmount = Number(searchParams?.amount ?? "");
  const initialAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : isRu ? 10000 : 100;

  return <TopUpClient isRu={isRu} initialAmount={initialAmount} />;
}
