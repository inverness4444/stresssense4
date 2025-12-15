import { NextResponse } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:organization"]);
  if ("error" in auth) return auth.error;

  const key = auth.key!;
  const org = await prisma.organization.findUnique({
    where: { id: key.organizationId },
    include: { subscription: { include: { plan: true } } },
  });
  if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404);

  return NextResponse.json({
    data: {
      id: org.id,
      name: org.name,
      plan: org.subscription?.plan
        ? {
            name: org.subscription.plan.name,
            limits: {
              maxEmployees: org.subscription.plan.maxEmployees,
              maxActiveSurveys: org.subscription.plan.maxActiveSurveys,
              maxTeams: org.subscription.plan.maxTeams,
            },
          }
        : null,
    },
  });
}
