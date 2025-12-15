import { cookies } from "next/headers";
import type { Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const lang = (await cookies()).get("ss_lang")?.value;
  return (lang === "ru" ? "ru" : "en") as Locale;
}
