import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { getCurrentUser } from "@/lib/auth";
import { recentNotifications, unreadCount } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n-server";
import { ensureOrgSettings } from "@/lib/access";
import { actionBadge } from "@/lib/nudgesStore";
import { StressSenseAiFloating } from "@/components/StressSenseAiFloating";
import { SelfStressSurveyProvider } from "@/components/app/SelfStressSurveyProvider";
import { BillingGate } from "@/components/app/BillingGate";
import { getBillingGateStatus } from "@/lib/billingGate";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: "StressSense | App",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const role = (user.role ?? "").toUpperCase();
  const isAdminRole = ["ADMIN", "HR", "SUPER_ADMIN"].includes(role);
  const orgCreatedAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : new Date();
  const gateStatus = await getBillingGateStatus(user.organizationId, orgCreatedAt);
  const isDemo = Boolean((user as any)?.organization?.isDemo);
  const aiEnabled = gateStatus.hasPaidAccess || env.isDev;
  const blockedReason = gateStatus.blockedReason as "trial_expired" | "subscription_inactive" | null;

  const [notifications, unread] = await Promise.all([
    recentNotifications(user.id, user.organizationId, 10),
    unreadCount(user.id, user.organizationId),
  ]);
  const demoMode = (await cookies()).get("ss_demo_mode")?.value === "1";
  const settings = await ensureOrgSettings(user.organizationId);
  const actionsCount = await actionBadge(user.organizationId);
  const feedbackInboxCount = await (async () => {
    if (!["MANAGER", "ADMIN", "HR", "SUPER_ADMIN"].includes(role)) return 0;
    try {
      return await prisma.anonymousFeedback.count({
        where: {
          orgId: user.organizationId,
          status: "new",
          ...(role === "MANAGER" ? { recipientLeaderId: user.id } : {}),
        },
      });
    } catch {
      return 0;
    }
  })();
  const createdAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : new Date();
  const diffDays = Math.max(0, Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - createdAt.getTime())) / (24 * 60 * 60 * 1000)));
  const showWarmup = !isDemo && diffDays > 0;
  const clientUser = {
    id: user.id,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };

  return (
      <BillingGate
        blocked={!isDemo && !demoMode && gateStatus.blocked}
        blockedReason={blockedReason}
        locale={locale}
        isAdmin={isAdminRole}
      >
      <SelfStressSurveyProvider locale={locale} userId={user.id} userEmail={user.email}>
        <div className="flex min-h-screen bg-slate-50">
          <AppSidebar
            user={clientUser}
            locale={locale}
            settings={settings}
            actionCount={actionsCount}
            feedbackInboxCount={feedbackInboxCount}
          />
          <div className="flex min-h-screen flex-1 flex-col">
            {showWarmup && (
              <div className="bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
                {locale === "ru"
                  ? `Продвинутые метрики будут доступны через 7 дней. Осталось: ${diffDays} дн.`
                  : `Advanced metrics unlock in 7 days. Days remaining: ${diffDays}.`}
              </div>
            )}
            <AppTopbar user={clientUser} notifications={notifications} unreadCount={unread} demoMode={demoMode} locale={locale} />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
            <StressSenseAiFloating
              role={user.role ?? "User"}
              locale={locale}
              userId={user.id}
              organizationId={user.organizationId}
              aiEnabled={aiEnabled}
            />
          </div>
        </div>
      </SelfStressSurveyProvider>
    </BillingGate>
  );
}
