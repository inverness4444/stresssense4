"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { StressSenseAiDrawer } from "./ai/StressSenseAiDrawer";
import type { AiContextData, AiContextType } from "../lib/ai/mockAiClient";

type FloatingProps = {
  role: string;
  locale: Locale;
};

export function StressSenseAiFloating({ role, locale }: FloatingProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    const onExternalOpen = () => setOpen(true);
    window.addEventListener("stresssense-ai-open", onExternalOpen);
    return () => {
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("stresssense-ai-open", onExternalOpen);
    };
  }, []);

  const contextType: AiContextType = useMemo(() => {
    if (pathname?.includes("/teams/")) return "team_overview";
    if (pathname?.includes("/surveys")) return "survey_report";
    if (pathname?.includes("/manager") || pathname?.includes("/actions")) return "manager_view";
    if (pathname?.includes("/my")) return "employee_home";
    return "workspace_overview";
  }, [pathname]);

  const contextData: AiContextData = useMemo(
    () => ({
      role,
      locale,
    }),
    [locale, role]
  );

  return (
    <>
      <StressSenseAiDrawer open={open} locale={locale} contextType={contextType} contextData={contextData} onClose={() => setOpen(false)} />
      <button
        aria-label="Open StressSense AI"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white shadow-2xl transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30 sm:bottom-6 sm:right-6"
      >
        <span className="text-xl">✨</span>
      </button>
    </>
  );
}
