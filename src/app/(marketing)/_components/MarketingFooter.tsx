import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M22 8l-10 6L2 8" />
    </svg>
  );
}

function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 3L3.5 10.2c-.9.37-.87 1.66.05 2.02l4.8 1.9 1.8 5.7c.26.82 1.32.95 1.76.22l2.7-4.6 4.95 3.7c.7.52 1.7.12 1.85-.74L23 4.2c.18-.96-.9-1.72-1.99-1.2z" />
    </svg>
  );
}

function SupportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="9" r="4" />
    </svg>
  );
}

export default async function MarketingFooter() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm space-y-3">
          <p className="text-lg font-semibold text-slate-900">StressSense</p>
          <p className="text-sm text-slate-600">
            {isRu ? "Stress intelligence платформа: опросы, AI-коуч, People & Comp, автоматизация и интеграции." : "Stress intelligence platform: surveys, AI coach, People & Comp, automation, and integrations."}
          </p>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {isRu ? "Поддержка и контакты" : "Support & contacts"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {isRu
                ? "Если что-то не работает или есть вопросы по StressSense — напишите нам, мы поможем."
                : "If something doesn’t work or you have questions about StressSense, reach out and we’ll help."}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href="mailto:QuadrantStress@proton.me"
              aria-label={isRu ? "Написать на почту" : "Send email"}
              title={isRu ? "Почта" : "Email"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <MailIcon className="h-4 w-4" />
            </a>
            <a
              href="https://t.me/QuadrantStress"
              target="_blank"
              rel="noreferrer"
              aria-label={isRu ? "Телеграм-канал" : "Telegram channel"}
              title={isRu ? "Телеграм-канал" : "Telegram channel"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <TelegramIcon className="h-4 w-4" />
            </a>
            <a
              href="https://t.me/QuadrantManager"
              target="_blank"
              rel="noreferrer"
              aria-label={isRu ? "Менеджер в Telegram" : "Manager in Telegram"}
              title={isRu ? "Менеджер в Telegram" : "Manager in Telegram"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <SupportIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl items-center justify-between px-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} StressSense by Quadrant. {isRu ? "Все права защищены." : "All rights reserved."}</p>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="hover:text-primary">
            {isRu ? "Политика конфиденциальности" : "Privacy policy"}
          </Link>
          <Link href="/terms" className="hover:text-primary">
            {isRu ? "Условия использования" : "Terms of use"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
