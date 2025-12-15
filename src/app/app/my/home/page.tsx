import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getMyHomeData } from "../actions";
import MyHomeClient from "./ui/MyHomeClient";
import { getLocale } from "@/lib/i18n-server";

export default async function MyHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Please sign in.</div>;
  }
  if (!["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes(user.role)) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Access denied.</div>;
  }
  const enabled = await isFeatureEnabled("employee_cockpit_v1", { organizationId: user.organizationId, userId: user.id });
  if (!enabled) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Feature not enabled.</div>;
  }

  const data = await getMyHomeData();
  const locale = await getLocale();
  return <MyHomeClient data={data} userName={user.name ?? ""} locale={locale} />;
}
