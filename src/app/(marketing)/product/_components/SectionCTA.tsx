import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

export default async function SectionCTA() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-emerald-50 py-16 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.15),transparent_40%)]" />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          {isRu ? "Готовы сделать команды спокойнее и вовлечённее?" : "Ready to make teams calmer and more engaged?"}
        </h2>
        <p className="mt-3 text-lg text-slate-600">
          {isRu
            ? "Запустите бесплатный trial или забронируйте демо. Мы покажем, как StressSense поможет HR и менеджерам действовать уверенно."
            : "Start a free trial or book a demo. We'll show how StressSense helps HR and managers act confidently."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:-translate-y-0.5"
          >
            {isRu ? "Начать free trial" : "Start free trial"}
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-primary/40 hover:text-primary"
          >
            {isRu ? "Забронировать демо" : "Book a demo"}
          </Link>
        </div>
      </div>
    </section>
  );
}
