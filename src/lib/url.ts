import { env } from "@/config/env";

export function getBaseUrl() {
  if (env.client.NEXT_PUBLIC_APP_URL) return env.client.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return env.isDev ? "http://localhost:3000" : "https://stresssense.app";
}
