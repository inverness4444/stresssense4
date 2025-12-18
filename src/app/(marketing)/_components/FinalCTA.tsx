import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

export default async function FinalCTA() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-indigo-50 to-emerald-50" />
      <div className="relative mx-auto max-w-5xl rounded-3xl bg-white/80 p-10 text-center shadow-2xl ring-1 ring-slate-200">
        <p className="text-base text-slate-600">
          {isRu
            ? "Запустите бесплатный trial или поговорите с нами — покажем, как StressSense работает на ваших данных за пару дней."
            : "Start a free trial or talk to us — we'll show how StressSense works on your data in just a couple of days."}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:translate-y-[-2px]"
          >
            {isRu ? "Начать бесплатный trial" : "Start free trial"}
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
          >
            {isRu ? "Связаться с нами" : "Contact us"}
          </Link>
        </div>
      </div>
    </section>
  );
}
