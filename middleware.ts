import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const generateNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const buildCsp = (nonce: string, isProd: boolean) => {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(isProd ? [] : ["'unsafe-eval'", "'unsafe-inline'"]),
  ];
  const connectSrc = ["'self'", ...(isProd ? [] : ["ws:"])];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    "form-action 'self'",
  ].join("; ");
};

const securityHeaders = (res: NextResponse, csp: string, nonce: string) => {
  const isProd = process.env.NODE_ENV === "production";
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Nonce", nonce);
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
};

export async function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isProd);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  securityHeaders(res, csp, nonce);

  if (req.method === "OPTIONS") return res;

  if (req.nextUrl.pathname.startsWith("/app/api")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? "dev-nextauth-secret" });
    if (!token) {
      const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      securityHeaders(denied, csp, nonce);
      return denied;
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
