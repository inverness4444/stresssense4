"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrganizationSettings, User } from "@prisma/client";
import { t, type Locale } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/features";
import clsx from "clsx";
import { useSelfStressSurvey } from "./SelfStressSurveyProvider";

type SidebarProps = {
  user: User & { organizationId: string };
  locale: Locale;
  settings: OrganizationSettings;
  actionCount?: number;
};

export function AppSidebar({ user, locale, settings, actionCount }: SidebarProps) {
  const pathname = usePathname();
  const { openSurvey } = useSelfStressSurvey();
  const notificationsEnabled = isFeatureEnabled("notifications", settings);
  const billingEnabled = isFeatureEnabled("growth_module_v1", settings);
  const role = (user.role ?? "").toUpperCase();

  const navItems = [
    // Базовые пункты видны всем
    { href: "/app/overview", label: t(locale, "navOverview"), icon: HomeIcon },
    { href: "/app/my/home", label: t(locale, "navMyWellbeing"), icon: HomeIcon },
    { href: "/app/actions", label: t(locale, "navActionCenter"), icon: ClipboardIcon, badge: actionCount },
    { href: "/app/manager/home", label: t(locale, "navTeamsOverview"), icon: LayersIcon, roles: ["MANAGER", "HR"] },
    // Остальные — по ролям, чтобы у сотрудника не было лишнего (настройки, биллинг и т.д.)
    { href: "/app/employees", label: t(locale, "navEmployees"), icon: UsersIcon, roles: ["HR", "ADMIN", "MANAGER"] },
    { href: "/app/teams", label: t(locale, "navTeams"), icon: LayersIcon, roles: ["HR", "ADMIN", "MANAGER"] },
    { href: "/app/my/stress-survey", label: t(locale, "navSurveys"), icon: ClipboardIcon, roles: ["EMPLOYEE", "HR", "ADMIN", "MANAGER"] },
    ...(notificationsEnabled ? [{ href: "/app/notifications", label: t(locale, "navNotifications"), icon: BellIcon, roles: ["HR", "ADMIN", "MANAGER", "EMPLOYEE"] }] : []),
    { href: "/app/developers", label: t(locale, "navDevelopers"), icon: CodeIcon, roles: ["HR", "ADMIN"] },
    { href: "/app/settings", label: t(locale, "navSettings"), icon: SettingsIcon, roles: ["HR", "ADMIN", "MANAGER"] },
    { href: "/app/settings/billing", label: t(locale, "navBilling"), icon: CreditCardIcon, roles: ["HR", "ADMIN"], visible: billingEnabled },
  ]
    .filter((item) => item.visible ?? true)
    .filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white/80 p-4 shadow-sm md:flex md:flex-col">
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-sm font-semibold text-white shadow-sm">
          💜
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">StressSense</p>
          <p className="text-xs font-medium text-slate-500">Workspace</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const content = (
            <>
              <item.icon className={clsx("h-4 w-4", active ? "text-primary" : "text-slate-500")} />
              {item.label}
              {item.badge ? (
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-2 text-[11px] font-semibold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </>
          );
          return (
            item.onClick ? (
              <button
                key={item.href}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  item.onClick?.();
                }}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition",
                  "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {content}
              </Link>
            )
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">{user.name}</p>
        <p className="truncate text-slate-500">{user.role}</p>
      </div>
    </aside>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-6 9 6v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 3a4 4 0 0 1 0 8M23 21v-2a4 4 0 0 0-3-3.87"
      />
    </svg>
  );
}

function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 4.5L12 12 3 7.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </svg>
  );
}

function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="5" width="16" height="16" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v4H9z" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 4.5h3l.6 2.4a2 2 0 0 0 1.6 1.5l2.4.4v3.4l-2.4.4a2 2 0 0 0-1.6 1.5l-.6 2.4h-3l-.6-2.4a2 2 0 0 0-1.6-1.5l-2.4-.4v-3.4l2.4-.4a2 2 0 0 0 1.6-1.5z"
      />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function CodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6l-6 6 6 6" />
    </svg>
  );
}

function CreditCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20M6 15h4" />
    </svg>
  );
}
