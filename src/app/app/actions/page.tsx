import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import Link from "next/link";

export default async function ActionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const role = (user.role ?? "").toUpperCase();
  const locale = await getLocale();
  if (!["HR", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">{t(locale, "accessDeniedBody")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mx-auto flex min-h-[320px] max-w-2xl flex-col items-center justify-center text-center">
        <p className="text-2xl font-semibold text-slate-900">{t(locale, "actionDisabledTitle")}</p>
        <p className="mt-2 text-sm text-slate-600">{t(locale, "actionDisabledSubtitle")}</p>
        <Link
          href="/app/surveys"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          {t(locale, "actionDisabledCta")}
        </Link>
      </div>
    </div>
  );
}
