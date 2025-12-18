import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function AccessDenied() {
  const locale = await getLocale();
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
      <p className="text-sm font-semibold">{t(locale, "accessDeniedTitle")}</p>
      <p className="mt-1 text-sm text-amber-700">{t(locale, "accessDeniedBody")}</p>
    </div>
  );
}
