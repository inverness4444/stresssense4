import { NextResponse } from "next/server";
import { authenticateApiRequest, errorResponse } from "@/lib/publicApi";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req, ["read:employees"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Number(searchParams.get("offset") ?? "0");
  const department = searchParams.get("department") ?? undefined;
  const location = searchParams.get("location") ?? undefined;

  const employees = await prisma.user.findMany({
    where: {
      organizationId: auth.key!.organizationId,
      isDeleted: false,
      ...(department ? { department } : {}),
      ...(location ? { location } : {}),
    },
    select: {
      id: true,
      employeeId: true,
      email: true,
      name: true,
      jobTitle: true,
      department: true,
      location: true,
      managerId: true,
      createdAt: true,
      updatedAt: true,
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: employees });
}
