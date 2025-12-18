import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { getCurrentUser } from "@/lib/auth";
import { recentNotifications, unreadCount } from "@/lib/notifications";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n-server";
import { ensureOrgSettings } from "@/lib/access";
import { actionBadge } from "@/lib/nudgesStore";
import { StressSenseAiFloating } from "@/components/StressSenseAiFloating";
import { SelfStressSurveyProvider } from "@/components/app/SelfStressSurveyProvider";

export const metadata: Metadata = {
  title: "StressSense | App",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [notifications, unread] = await Promise.all([
    recentNotifications(user.id, user.organizationId, 10),
    unreadCount(user.id, user.organizationId),
  ]);
  const demoMode = (await cookies()).get("ss_demo_mode")?.value === "1";
  const locale = await getLocale();
  const settings = await ensureOrgSettings(user.organizationId);
  const actionsCount = await actionBadge(user.organizationId);

  return (
    <SelfStressSurveyProvider locale={locale}>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={user} locale={locale} settings={settings} actionCount={actionsCount} />
        <div className="flex min-h-screen flex-1 flex-col">
          <AppTopbar user={user} notifications={notifications} unreadCount={unread} demoMode={demoMode} locale={locale} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
          <StressSenseAiFloating role={user.role ?? "User"} locale={locale} />
        </div>
      </div>
    </SelfStressSurveyProvider>
  );
}
