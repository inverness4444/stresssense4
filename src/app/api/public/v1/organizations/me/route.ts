import { NextResponse } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";
import { BILLING_MODEL, MIN_SEATS, normalizeSeats } from "@/config/pricing";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:organization"]);
  if ("error" in auth) return auth.error;

  const key = auth.key!;
  const org = await prisma.organization.findUnique({
    where: { id: key.organizationId },
    include: { subscription: true, settings: true },
  });
  if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404);

  const seatsUsed = await prisma.user.count({ where: { organizationId: org.id } });
  const flags = org.settings?.featureFlags;
  const flagsObj = flags && typeof flags === "object" && !Array.isArray(flags) ? (flags as Record<string, unknown>) : {};
  const fallbackSeats = typeof flagsObj.billingSeats === "number" ? flagsObj.billingSeats : null;
  const rawSeats = (org.subscription as any)?.seats ?? fallbackSeats ?? seatsUsed ?? MIN_SEATS;
  const seats = Math.max(normalizeSeats(rawSeats), seatsUsed);

  return NextResponse.json({
    data: {
      id: org.id,
      name: org.name,
      billing: {
        model: BILLING_MODEL,
        seats,
        seatsUsed,
      },
    },
  });
}
