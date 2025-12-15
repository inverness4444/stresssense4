import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export async function mobileLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export async function getMobileUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return prisma.user.findUnique({
    where: { id: token },
    include: { teams: true },
  });
}
