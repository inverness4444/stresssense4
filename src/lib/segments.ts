import { prisma } from "./prisma";

export type SegmentFilter = {
  departments?: string[];
  locations?: string[];
  managerIds?: string[];
  attributes?: Record<string, string[]>;
};

export async function filterResponsesBySegments(surveyId: string, orgId: string, filter: SegmentFilter) {
  // simplified: filter invite tokens users by fields, then keep responses
  const inviteTokens = await prisma.surveyInviteToken.findMany({
    where: { surveyId, survey: { organizationId: orgId } },
    include: { user: { include: { attributes: { include: { attribute: true } } } } },
  });
  const allowedUserIds = inviteTokens
    .filter((token: any) => {
      const u = token.user;
      if (filter.departments?.length && (!u.department || !filter.departments.includes(u.department))) return false;
      if (filter.locations?.length && (!u.location || !filter.locations.includes(u.location))) return false;
      if (filter.managerIds?.length && (!u.managerId || !filter.managerIds.includes(u.managerId))) return false;
      if (filter.attributes) {
        const kv = Object.entries(filter.attributes);
        for (const [k, values] of kv) {
          const match = u.attributes.find((a: any) => a.attribute.key === k);
          if (!match || !values.includes(match.value)) return false;
        }
      }
      return true;
    })
    .map((t: any) => t.userId);

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId, inviteToken: { userId: { in: allowedUserIds } } },
    include: { answers: true, inviteToken: { include: { user: true } } },
  });
  return responses;
}
