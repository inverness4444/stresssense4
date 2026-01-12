"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  blocked: boolean;
  blockedReason?: "trial_expired" | "subscription_inactive" | null;
  locale: Locale;
  isAdmin: boolean;
  allowedPrefixes?: string[];
  children: React.ReactNode;
};

const ALLOWED_PREFIXES = ["/app/settings/billing"];

export function BillingGate({ blocked, blockedReason, locale, isAdmin, allowedPrefixes = [], children }: Props) {
  const pathname = usePathname();
  const allowed = isAdmin && [...ALLOWED_PREFIXES, ...allowedPrefixes].some((prefix) => pathname.startsWith(prefix));

  if (!blocked || allowed) return <>{children}</>;

  const isSubscriptionExpired = blockedReason === "subscription_inactive";
  const titleKey = isSubscriptionExpired ? "billingSubscriptionExpiredTitle" : "billingTrialExpiredTitle";
  const bodyKey = isAdmin
    ? isSubscriptionExpired
      ? "billingSubscriptionExpiredBodyAdmin"
      : "billingTrialExpiredBodyAdmin"
    : isSubscriptionExpired
      ? "billingSubscriptionExpiredBodyUser"
      : "billingTrialExpiredBodyUser";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">StressSense</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{t(locale, titleKey)}</h1>
        <p className="mt-2 text-sm text-slate-600">{t(locale, bodyKey)}</p>
        {isAdmin && (
          <div className="mt-6">
            <Link
              href="/app/settings/billing"
              className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm"
            >
              {t(locale, "billingTrialExpiredCta")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
