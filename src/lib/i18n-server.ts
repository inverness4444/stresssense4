import { cookies, headers } from "next/headers";
import type { Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const lang = (await cookies()).get("ss_lang")?.value;
  if (lang?.toLowerCase().startsWith("ru")) return "ru";
  if (lang?.toLowerCase().startsWith("en")) return "en";

  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  for (const part of acceptLanguage.split(",")) {
    const code = part.trim().split(";")[0]?.toLowerCase();
    if (code?.startsWith("ru")) return "ru";
    if (code?.startsWith("en")) return "en";
  }

  return "en";
}
