import { prisma } from "@/lib/prisma";

type UserLike = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  organizationId: string;
};

export async function ensureMemberForUser(user: UserLike) {
  const role = (user.role ?? "").toUpperCase();
  if (role === "SUPER_ADMIN") return null;

  let member = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { team: true, organization: true },
  });
  if (member) return member;

  const email = user.email?.toLowerCase().trim();
  if (email) {
    const byEmail = await prisma.member.findFirst({
      where: { email, organizationId: user.organizationId },
      include: { team: true, organization: true },
    });
    if (byEmail) {
      if (!byEmail.userId) {
        await prisma.member.update({
          where: { id: byEmail.id },
          data: { userId: user.id },
        });
      }
      return { ...byEmail, userId: user.id };
    }
  }

  let teamId = (await prisma.userTeam.findFirst({ where: { userId: user.id } }))?.teamId ?? null;
  if (!teamId) {
    const fallbackTeam =
      (await prisma.team.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: "asc" },
      })) ??
      (await prisma.team.create({
        data: {
          name: "Default team",
          description: "Auto-created for new members",
          organizationId: user.organizationId,
        },
      }));
    teamId = fallbackTeam.id;
  }

  member = await prisma.member.create({
    data: {
      displayName: user.name ?? user.email ?? "Employee",
      role: (role || "EMPLOYEE") as any,
      email: email ?? "",
      organizationId: user.organizationId,
      teamId,
      userId: user.id,
    },
    include: { team: true, organization: true },
  });

  await prisma.userTeam
    .create({ data: { userId: user.id, teamId } })
    .catch(() => null);

  const memberCount = await prisma.member.count({ where: { teamId } });
  await prisma.team.update({ where: { id: teamId }, data: { memberCount } });

  return member;
}
