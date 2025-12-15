import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const PARTNER_SESSION = "ss_partner_session";

export async function partnerSignIn(email: string, password: string) {
  const user = await prisma.partnerUser.findFirst({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  (await cookies()).set(PARTNER_SESSION, user.id, { httpOnly: true, sameSite: "lax", path: "/partner" });
  return user;
}

export async function getPartnerUser() {
  const id = (await cookies()).get(PARTNER_SESSION)?.value;
  if (!id) return null;
  return prisma.partnerUser.findUnique({ where: { id } });
}

export async function partnerSignOut() {
  (await cookies()).delete(PARTNER_SESSION);
}
