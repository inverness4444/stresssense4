'use server';

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

export async function signInAction(formData: FormData) {
  const secureCookies = process.env.NODE_ENV === "production";
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limit = rateLimit(`signin:${ip}`, { limit: 100, windowMs: 60_000 });
  if (!limit.allowed) {
    return { error: "Too many attempts. Try again in a minute." };
  }
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid credentials." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid credentials." };
  }

  const store = await cookies();
  store.set("ss_user_id", user.id, {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  store.set("ss_demo_mode", "0", { path: "/", maxAge: 60 * 60 * 24, sameSite: "strict", secure: secureCookies });

  return { success: true };
}
