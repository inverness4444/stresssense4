import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isAdminLike } from "@/lib/roles";
import { ensureMemberForUser } from "@/lib/members";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email ?? undefined;
  if (!userId && !email) return null;

  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
  }
  if (!user && email) {
    user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }
  if (!user) return null;
  const member =
    (await prisma.member.findFirst({
      where: { userId: user.id },
      include: { team: true, organization: true },
    })) ?? (await ensureMemberForUser(user));
  return { ...user, member };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export function isAdmin(user: { role: string }) {
  return isAdminLike(user.role);
}
