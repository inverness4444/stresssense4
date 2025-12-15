import { NextResponse } from "next/server";

export async function GET() {
  // Placeholder public API response; wire to ApiClient auth and org scoping later.
  return NextResponse.json({
    data: {
      id: "org_placeholder",
      name: "Demo org",
      region: "eu",
    },
  });
}
