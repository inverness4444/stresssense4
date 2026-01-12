"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";
import { setLocale } from "@/app/actions/setLocale";

export default function Header({ locale = "en" }: { locale?: Locale }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState("#product");
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const ids = ["#product", "#demo", "#pricing", "#terms"];
    const onScroll = () => {
      const current = ids
        .map((id) => {
          const el = document.querySelector(id) as HTMLElement | null;
          return el ? { id, top: el.getBoundingClientRect().top } : null;
        })
        .filter(Boolean)
        .map((x) => x as { id: string; top: number })
        .filter((x) => x.top <= 140)
        .sort((a, b) => b.top - a.top)[0];
      if (current) setActive(current.id);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/85 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-xl" : "bg-white/60 ring-1 ring-transparent backdrop-blur-xl"
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

        <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-semibold text-slate-700 md:flex">
          {[
            { href: "#product", label: t(locale, "headerProduct") },
            { href: "#demo", label: t(locale, "headerDemo") },
            { href: "#pricing", label: t(locale, "headerPricing") },
            { href: "#terms", label: t(locale, "headerTerms") },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-slate-950 ${active === item.href ? "text-primary" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.querySelector(item.href);
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
          <Link href="/signin" className="hidden text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 sm:inline-flex">
            {t(locale, "login")}
          </Link>
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
