"use client";

import { useEffect, useState } from "react";
import { StressSenseAiWidget } from "@/components/StressSenseAiWidget";

type FloatingProps = {
  mode?: "landing" | "employee" | "manager";
};

export function StressSenseAiFloating({ mode = "manager" }: FloatingProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-label="AI overlay"
        />
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-32px)] sm:bottom-6 sm:right-6 sm:w-[420px]">
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">StressSense AI</p>
                <p className="text-[11px] text-slate-500">Только про рабочий стресс, не мед. советы.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <StressSenseAiWidget mode={mode} variant="inline" onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
      <button
        aria-label="Open StressSense AI"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white shadow-2xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30 sm:bottom-6 sm:right-6"
      >
        <span className="text-xl">✨</span>
      </button>
    </>
  );
}
