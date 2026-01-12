'use server';

import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export async function setLocale(lang: Locale) {
  const store = await cookies();
  const secureCookies = process.env.NODE_ENV === "production";
  store.set("ss_lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "strict",
    secure: secureCookies,
  });
}
