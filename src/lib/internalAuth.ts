import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const INTERNAL_SESSION = "ss_internal_session";

export async function internalSignIn(email: string, password: string) {
  const user = await prisma.internalUser.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  (await cookies()).set(INTERNAL_SESSION, user.id, { httpOnly: true, sameSite: "lax", path: "/internal" });
  return user;
}

export async function getInternalUser() {
  const id = (await cookies()).get(INTERNAL_SESSION)?.value;
  if (!id) return null;
  return prisma.internalUser.findUnique({ where: { id } });
}

export async function internalSignOut() {
  (await cookies()).delete(INTERNAL_SESSION);
}
