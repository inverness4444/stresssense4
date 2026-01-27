"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Article = { id: string; title: string; description: string | null; slug?: string };

export function HelpLauncher() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Article[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const ctx = getContextFromPath(pathname ?? "");
    fetch(`/api/help${ctx ? `?context=${ctx}` : ""}`)
      .then((res) => res.json())
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]));
  }, [open, pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-primary"
        aria-label="Help"
      >
        <InfoIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Help</p>
              <p className="text-sm text-slate-700">Contextual guides</p>
            </div>
            <a href="/app/help" className="text-xs font-semibold text-primary hover:underline">
              Open
            </a>
          </div>
          <div className="mt-3 space-y-2">
            {items.map((a) => (
              <div key={a.id} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-600">{a.description}</p>
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-slate-500">No help articles yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v5" />
      <circle cx="12" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function getContextFromPath(path: string) {
  if (path.startsWith("/app/overview")) return "overview";
  if (path.startsWith("/app/surveys")) return "surveys";
  if (path.startsWith("/app/settings")) return "settings_integrations";
  return undefined;
}
