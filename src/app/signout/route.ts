import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const store = await cookies();
  store.set("ss_user_id", "", { path: "/", maxAge: 0 });
  store.set("ss_demo_mode", "0", { path: "/", maxAge: 0 });
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
