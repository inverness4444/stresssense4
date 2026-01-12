'use server';

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { BILLING_MODEL, normalizeSeats } from "@/config/pricing";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";

export async function signupAction(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`signup:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limiter.allowed) {
    redirect("/signup?error=rate_limited");
  }
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  const sizeRaw = (formData.get("size") as string)?.trim() ?? "";
  const termsAccepted = formData.get("termsAccepted");
  if (!email || !password || !name || !company) {
    throw new Error("Missing fields");
  }
  if (!/^\d+$/.test(sizeRaw) || Number(sizeRaw) <= 0) {
    redirect("/signup?error=invalid_size");
  }
  if (!termsAccepted) {
    redirect("/signup?error=terms_required");
  }
  if (password.length < 8) {
    redirect("/signup?error=weak_password");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/signin?error=email_exists`);
  }

  const baseSlug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `org-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) break;
    attempt += 1;
    slug = `${baseSlug}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  const org = await prisma.organization.create({
    data: {
      name: company,
      slug,
      inviteToken: crypto.randomBytes(24).toString("hex"),
      isDemo: false,
    },
  });

  const teamSize = Number(sizeRaw);
  const seats = normalizeSeats(teamSize);
  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      featureFlags: { billingModel: BILLING_MODEL, billingSeats: seats, teamSize: seats },
    },
    update: {
      featureFlags: { billingModel: BILLING_MODEL, billingSeats: seats, teamSize: seats },
    },
  });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: hash,
      organizationId: org.id,
      role: "HR",
    },
  });

  redirect("/signin");
}
