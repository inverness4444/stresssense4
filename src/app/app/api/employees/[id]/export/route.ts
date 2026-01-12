import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportUserData } from "@/lib/gdpr";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const data = await exportUserData(id, user.organizationId);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="employee-${id}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 400 });
  }
}
