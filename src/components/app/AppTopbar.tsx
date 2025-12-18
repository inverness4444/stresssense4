"use client";

import { useMemo, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Notification, User } from "@prisma/client";
import { NotificationsBell } from "./NotificationsBell";
import { HelpLauncher } from "./HelpLauncher";
import { t, type Locale } from "@/lib/i18n";
import { setLocale } from "@/app/actions/setLocale";
import { useRouter } from "next/navigation";

export function AppTopbar({ user, notifications, unreadCount, demoMode, locale }: { user: User; notifications: Notification[]; unreadCount: number; demoMode?: boolean; locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const title = useMemo(() => {
    if (!pathname) return user.role === "MANAGER" ? t(locale, "navMyTeams") : t(locale, "navOverview");
    if (pathname.startsWith("/app/employees")) return t(locale, "navEmployees");
    if (pathname.startsWith("/app/teams") && pathname.includes("/stress")) return t(locale, "navTeamStress");
    if (pathname.startsWith("/app/teams")) return t(locale, "navTeams");
    if (pathname.startsWith("/app/surveys")) return t(locale, "navSurveys");
    if (pathname.startsWith("/app/notifications")) return t(locale, "navNotifications");
    if (pathname.startsWith("/app/settings")) return t(locale, "navSettings");
    return user.role === "MANAGER" ? t(locale, "navMyTeams") : t(locale, "navOverview");
  }, [pathname, user.role, locale]);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">StressSense</p>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {demoMode && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">{t(locale, "demoBadge")}</span>}
      </div>
      <div className="flex items-center gap-3">
        <HelpLauncher />
        <LanguageSwitcher locale={locale} pending={pending} onChange={(lang) => startTransition(async () => { await setLocale(lang); router.refresh(); })} />
        <NotificationsBell notifications={notifications} unreadCount={unreadCount} />
        <div className="flex items-center gap-3 rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {user.name?.charAt(0) ?? "A"}
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <Link
            href="/signout"
            className="rounded-full border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {locale === "ru" ? "Выйти" : "Sign out"}
          </Link>
        </div>
      </div>
    </header>
  );
}

function LanguageSwitcher({ locale, onChange, pending }: { locale: Locale; onChange: (lang: Locale) => void; pending: boolean }) {
  return (
    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
      <button
        type="button"
        disabled={pending}
        className={`rounded-full px-2 py-1 ${locale === "en" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700"}`}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        type="button"
        disabled={pending}
        className={`rounded-full px-2 py-1 ${locale === "ru" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700"}`}
        onClick={() => onChange("ru")}
      >
        RU
      </button>
    </div>
  );
}
