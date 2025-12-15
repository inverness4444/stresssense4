"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const links = [
  { href: "#product", label: "О продукте" },
  { href: "#solutions", label: "Решения" },
  { href: "#how", label: "Как работает" },
  { href: "#integrations", label: "Интеграции" },
  { href: "#pricing", label: "Цены" },
  { href: "#demo", label: "Live demo" },
];

export default function ProductSubnav() {
  const [active, setActive] = useState<string>(links[0].href);

  useEffect(() => {
    const handler = () => {
      const offsets = links.map((l) => {
        const el = document.querySelector(l.href) as HTMLElement | null;
        return el ? { href: l.href, top: el.getBoundingClientRect().top } : null;
      });
      const firstAbove = offsets
        .filter(Boolean)
        .map((o) => o as { href: string; top: number })
        .filter((o) => o.top <= 120)
        .sort((a, b) => b.top - a.top)[0];
      if (firstAbove) setActive(firstAbove.href);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="sticky top-16 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 overflow-x-auto gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 transition ${
              active === link.href ? "bg-primary/10 text-primary shadow-sm" : "hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/signup"
          className="ml-auto hidden rounded-full bg-primary px-4 py-2 text-white shadow-sm transition hover:shadow-md sm:inline-flex"
        >
          Начать бесплатно
        </Link>
      </div>
    </div>
  );
}
