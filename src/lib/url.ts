import { env } from "@/config/env";

export function getBaseUrl() {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (env.client.NEXT_PUBLIC_APP_URL) return env.client.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  if (process.env.RENDER_EXTERNAL_HOSTNAME) return `https://${process.env.RENDER_EXTERNAL_HOSTNAME.replace(/\/$/, "")}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  if (typeof window !== "undefined") return window.location.origin;
  return env.isDev ? "http://localhost:3000" : "https://stresssense.app";
}
