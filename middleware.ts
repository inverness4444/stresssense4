import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const securityHeaders = (res: NextResponse) => {
  const isProd = process.env.NODE_ENV === "production";
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  // CSP tuned for Next.js + Tailwind, without inline scripts
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
    ].join("; ")
  );
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  securityHeaders(res);

  if (req.method === "OPTIONS") return res;

  if (req.nextUrl.pathname.startsWith("/app/api")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? "dev-nextauth-secret" });
    if (!token) {
      const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      securityHeaders(denied);
      return denied;
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
