import { NextResponse } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:organization"]);
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findUnique({
    where: { id: auth.key!.organizationId },
    select: { id: true, name: true, region: true },
  });
  if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404);

  return NextResponse.json({ data: org });
}
