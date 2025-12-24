'use server';

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function signupAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  if (!email || !password || !name || !company) {
    throw new Error("Missing fields");
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
