import "server-only";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "@/config/env";

const MOBILE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type MobileTokenPayload = {
  sub: string;
  exp: number;
};

function signMobileToken(payload: MobileTokenPayload) {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", env.SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyMobileToken(token: string): MobileTokenPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = crypto.createHmac("sha256", env.SESSION_SECRET).update(data).digest("base64url");
  if (sig.length !== expected.length) return null;
  const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as MobileTokenPayload;
    if (!payload?.sub || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function mobileLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const token = signMobileToken({ sub: user.id, exp: Date.now() + MOBILE_TOKEN_TTL_MS });
  return { user, token };
}

export async function getMobileUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const payload = verifyMobileToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.sub },
    include: { teams: true },
  });
}
