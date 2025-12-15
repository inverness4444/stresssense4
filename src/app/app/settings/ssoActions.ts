'use server';

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function saveSSOConfig(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/signin");

  const organizationId = formData.get("organizationId") as string;
  if (organizationId !== user.organizationId) redirect("/signin");

  const providerType = (formData.get("providerType") as string) ?? "saml";
  const data = {
    organizationId,
    providerType,
    displayName: (formData.get("displayName") as string) ?? "Workspace SSO",
    issuer: (formData.get("issuer") as string) || null,
    ssoUrl: (formData.get("ssoUrl") as string) || null,
    certificate: (formData.get("certificate") as string) || null,
    oidcClientId: (formData.get("oidcClientId") as string) || null,
    oidcClientSecret: (formData.get("certificate") as string) || null,
    oidcTokenUrl: (formData.get("oidcTokenUrl") as string) || null,
    oidcUserInfoUrl: (formData.get("oidcUserInfoUrl") as string) || null,
    oidcScope: (formData.get("oidcScope") as string) || null,
    isEnabled: formData.get("isEnabled") === "on",
  };

  await prisma.sSOConfig.upsert({
    where: { organizationId },
    update: data,
    create: data,
  });

  redirect("/app/settings");
}
