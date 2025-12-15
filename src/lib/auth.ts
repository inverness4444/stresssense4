import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getOrganizationBySlug, getTeamsByOrg } from "./orgData";

const SESSION_COOKIE = "ss_user_id";

export async function getCurrentUser() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  if (sessionId.startsWith("demo")) {
    const parts = sessionId.split(":");
    const slug = parts[1] || "nova-bank";
    const roleToken = parts[2] || "manager";
    const org = getOrganizationBySlug(slug) ?? getOrganizationBySlug("nova-bank");
    if (!org) return null;
    const teams = getTeamsByOrg(org.id);
    return {
      id: sessionId,
      email: roleToken === "manager" ? "demo.manager@stresssense.app" : "demo.hr@stresssense.app",
      name: roleToken === "manager" ? "Demo Manager" : "Demo HR",
      role: roleToken === "manager" ? "MANAGER" : "ADMIN",
      organizationId: org.id,
      organization: org,
      teams: teams.map((team) => ({ team })),
    } as any;
  }

  return prisma.user.findUnique({
    where: { id: sessionId },
    include: {
      organization: true,
      teams: {
        include: {
          team: true,
        },
      },
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

export function isAdmin(user: { role: string }) {
  return user.role === "ADMIN";
}
