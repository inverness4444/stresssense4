import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";

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
        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resources</p>
            <Link href="/resource-hub" className="block hover:text-primary">
              Resource hub
            </Link>
            <Link href="/developers" className="block hover:text-primary">
              Developers
            </Link>
            <Link href="/help" className="block hover:text-primary">
              Help center
            </Link>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Company</p>
            <Link href="/privacy" className="block hover:text-primary">
              {isRu ? "Политика конфиденциальности" : "Privacy policy"}
            </Link>
            <Link href="/terms" className="block hover:text-primary">
              {isRu ? "Условия использования" : "Terms of use"}
            </Link>
            <Link href="/signin" className="block hover:text-primary">
              Sign in
            </Link>
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
