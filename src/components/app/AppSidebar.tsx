"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OrganizationSettings, User } from "@prisma/client";
import { t, type Locale } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/features";
import { getRoleLabel, normalizeRole } from "@/lib/roles";
import clsx from "clsx";

type SidebarUser = Pick<User, "id" | "name" | "role" | "organizationId">;

type SidebarProps = {
  user: SidebarUser;
  locale: Locale;
  settings: OrganizationSettings;
  actionCount?: number;
  feedbackInboxCount?: number;
};

export function AppSidebar({ user, locale, settings, actionCount, feedbackInboxCount }: SidebarProps) {
  const pathname = usePathname();
  const billingEnabled = isFeatureEnabled("growth_module_v1", settings);
  const role = normalizeRole(user.role);

  const navItems = [
    // Базовые пункты видны всем
    { href: "/app/overview", label: t(locale, "navOverview"), icon: HomeIcon, roles: ["HR", "ADMIN", "MANAGER", "SUPER_ADMIN"] },
    { href: "/app/my/home", label: t(locale, "navMyWellbeing"), icon: HomeIcon },
    // Остальные — по ролям, чтобы у сотрудника не было лишнего (настройки, биллинг и т.д.)
    { href: "/app/employees", label: t(locale, "navEmployees"), icon: UsersIcon, roles: ["HR", "ADMIN", "MANAGER", "SUPER_ADMIN"] },
    { href: "/app/teams", label: t(locale, "navTeams"), icon: LayersIcon, roles: ["HR", "ADMIN", "MANAGER", "SUPER_ADMIN"] },
    { href: "/app/my/stress-survey", label: t(locale, "navSurveys"), icon: ClipboardIcon, roles: ["EMPLOYEE", "HR", "ADMIN", "MANAGER", "SUPER_ADMIN"] },
    { href: "/app/feedback", label: t(locale, "navFeedback"), icon: MessageIcon, roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"] },
    {
      href: "/app/feedback/inbox",
      label: t(locale, "navFeedbackInbox"),
      icon: InboxIcon,
      roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"],
      badge: feedbackInboxCount && feedbackInboxCount > 0 ? feedbackInboxCount : undefined,
    },
    { href: "/app/support", label: t(locale, "navSupport"), icon: HelpIcon },
    { href: "/app/settings/billing", label: t(locale, "navBilling"), icon: CreditCardIcon, roles: ["HR", "ADMIN", "SUPER_ADMIN"], visible: billingEnabled },
    { href: "/admin", label: t(locale, "navSuperAdmin"), icon: ShieldIcon, roles: ["SUPER_ADMIN"] },
  ]
    .filter((item) => item.visible ?? true)
    .filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white/80 p-4 shadow-sm md:flex md:flex-col">
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
        <img
          src="/branding/quadrantlogo.PNG"
          alt="StressSense"
          className="h-12 w-auto"
        />
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
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center bg-primary/10 px-2 text-[11px] font-semibold text-primary">
                  +{item.badge}
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
        <p className="truncate text-slate-500">{getRoleLabel(user.role, locale)}</p>
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

function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function InboxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v12H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4 4h8l4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.4-3 8.4-7 9-4-0.6-7-4.6-7-9V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function HelpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9a2.5 2.5 0 1 1 3.6 2.3c-.9.4-1.6 1.2-1.6 2.2" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
