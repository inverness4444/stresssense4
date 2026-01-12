import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

const SUPPORT_EMAIL = "QuadrantStress@proton.me";
const TELEGRAM_CHANNEL = "QuadrantStress";
const TELEGRAM_MANAGER = "QuadrantManager";
const TELEGRAM_CHANNEL_LINK = `https://t.me/${TELEGRAM_CHANNEL}`;
const TELEGRAM_MANAGER_LINK = `https://t.me/${TELEGRAM_MANAGER}`;

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locale = await getLocale();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t(locale, "supportTitle")}</h1>
        <p className="text-sm text-slate-600">{t(locale, "supportSubtitle")}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(locale, "supportEmailTitle")}</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{SUPPORT_EMAIL}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
          >
            {t(locale, "supportEmailAction")}
          </a>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(locale, "supportTelegramChannelTitle")}</p>
          <p className="mt-2 text-base font-semibold text-slate-900">@{TELEGRAM_CHANNEL}</p>
          <a
            href={TELEGRAM_CHANNEL_LINK}
            className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
          >
            {t(locale, "supportTelegramChannelAction")}
          </a>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t(locale, "supportTelegramManagerTitle")}</p>
          <p className="mt-2 text-base font-semibold text-slate-900">@{TELEGRAM_MANAGER}</p>
          <a
            href={TELEGRAM_MANAGER_LINK}
            className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
          >
            {t(locale, "supportTelegramManagerAction")}
          </a>
        </div>
      </section>
    </div>
  );
}
