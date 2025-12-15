"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "#overview", label: "Overview" },
  { href: "#stress", label: "Stress analytics" },
  { href: "#manager", label: "Manager cockpit" },
  { href: "#employee", label: "Employee" },
  { href: "#people", label: "People & Comp" },
  { href: "#ai", label: "AI & automation" },
  { href: "#security", label: "Security" },
  { href: "#integrations", label: "Integrations" },
];

export default function ProductSubnav() {
  const [active, setActive] = useState<string>("#overview");

  useEffect(() => {
    const handler = () => {
      const offsets = links.map((l) => {
        const el = document.querySelector(l.href) as HTMLElement | null;
        if (!el) return { href: l.href, top: Number.POSITIVE_INFINITY };
        const rect = el.getBoundingClientRect();
        return { href: l.href, top: Math.abs(rect.top - 120) };
      });
      const current = offsets.sort((a, b) => a.top - b.top)[0];
      if (current && current.href !== active) setActive(current.href);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [active]);

  return (
    <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-xl ring-1 ring-slate-200/60">
      <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-3 text-sm font-semibold text-slate-700 sm:px-6 lg:px-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-3 py-2 transition-colors ${active === link.href ? "bg-primary/10 text-primary" : "hover:text-slate-950"}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
