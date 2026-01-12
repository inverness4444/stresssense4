\"use client\";

import Link from \"next/link\";
import { useEffect, useState, useTransition } from \"react\";
import { useRouter } from \"next/navigation\";
import { t, type Locale } from \"@/lib/i18n\";
import { setLocale } from \"@/app/actions/setLocale\";

const navLinks = (locale: Locale) => [
  { label: locale === "ru" ? "Продукт" : "Product", href: "#product" },
  { label: locale === "ru" ? "Как работает" : "How it works", href: "#how-it-works" },
  { label: locale === "ru" ? "Для админ-команд" : "For admin teams", href: "#for-hr" },
  { label: locale === "ru" ? "Ресурсы" : "Resources", href: "#resources" },
  { label: locale === "ru" ? "Цены" : "Pricing", href: "#pricing" },
];

export default function Header({ locale = "en" }: { locale?: Locale }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/85 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-xl"
          : "bg-white/60 ring-1 ring-transparent backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/branding/quadrantlogo.PNG"
            alt="StressSense"
            className="h-12 w-auto"
          />
          <div className="leading-tight">
            <p className="text-base font-semibold text-slate-900">StressSense</p>
            <p className="text-xs font-medium text-slate-500">by Quadrant</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          {navLinks(locale).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/signin"
            className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
          >
            {t(locale, "login")}
          </Link>
          <Link
            href="/demo"
            className="border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm"
          >
            {t(locale, "tryDemo")}
          </Link>
          <LanguageSwitcher locale={locale} onChange={(lang) => startTransition(async () => {
            await setLocale(lang);
            router.refresh();
          })} pending={pending} />
        </div>

        <button
          aria-label="Open menu"
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.6}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 transform transition-all duration-300 md:hidden ${
          isMenuOpen ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-80 max-w-full flex-col gap-6 bg-white px-6 py-6 shadow-xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/branding/quadrantlogo.PNG"
                alt="StressSense"
                className="h-12 w-auto"
              />
              <span className="text-base font-semibold text-slate-900">StressSense</span>
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.6}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-4 text-base font-semibold text-slate-800">
            {navLinks(locale).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl px-3 py-3 transition-colors hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Link
              href="/signin"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              {t(locale, "login")}
            </Link>
            <Link
              href="/demo"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-center text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              {t(locale, "tryDemo")}
            </Link>
            <LanguageSwitcher
              locale={locale}
              pending={pending}
              onChange={(lang) =>
                startTransition(async () => {
                  await setLocale(lang);
                  router.refresh();
                })
              }
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function LanguageSwitcher({ locale, onChange, pending }: { locale: Locale; onChange: (lang: Locale) => void; pending: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
      <button
        type="button"
        disabled={pending}
        className={`px-2 py-1 ${locale === "en" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700"}`}
        onClick={() => onChange("en")}
      >
        EN
      </button>
      <button
        type="button"
        disabled={pending}
        className={`px-2 py-1 ${locale === "ru" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700"}`}
        onClick={() => onChange("ru")}
      >
        RU
      </button>
    </div>
  );
}
