import { env } from "@/config/env";

const normalize = (value: string) => value.replace(/\/$/, "");
const isLocalhost = (value: string) => {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return false;
  }
};

export function getBaseUrl() {
  const isProd = !env.isDev;
  const candidates = [
    env.PUBLIC_BASE_URL,
    env.client.NEXT_PUBLIC_APP_URL,
    env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (isProd && isLocalhost(candidate)) continue;
    return normalize(candidate);
  }
  if (typeof window !== "undefined") return window.location.origin;
  return env.isDev ? "http://localhost:3000" : "https://stresssense.app";
}
