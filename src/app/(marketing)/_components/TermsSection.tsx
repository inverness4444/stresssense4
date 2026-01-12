import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

export default async function TermsSection() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const title = isRu ? "Условия" : "Terms";
  const subtitle = isRu
    ? "Короткий доступ к основным юридическим документам StressSense."
    : "Quick access to StressSense legal documents.";
  const faqTitle = isRu ? "FAQ — популярные вопросы и ответы" : "FAQ — common questions and answers";
  return (
    <section id="terms" className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              href="/privacy"
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white"
            >
              <span>{isRu ? "Политика конфиденциальности" : "Privacy policy"}</span>
              <span className="text-primary transition group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/terms"
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white"
            >
              <span>{isRu ? "Условия использования" : "Terms of use"}</span>
              <span className="text-primary transition group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href="/faq"
              className="group flex w-full max-w-lg items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white"
            >
              <span>{faqTitle}</span>
              <span className="text-primary transition group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
