import { prisma } from "@/lib/prisma";

export async function resolveWorkspaceByHost(host: string) {
  const lower = host.toLowerCase();
  // custom domain lookup
  const orgByDomain = await prisma.organization.findFirst({ where: { domain: lower } });
  if (orgByDomain) return { organizationId: orgByDomain.id };

  const parts = lower.split(".");
  const sub = parts.length > 2 ? parts[0] : null;
  if (sub) {
    const orgBySub = await prisma.organization.findFirst({ where: { subdomain: sub } });
    if (orgBySub) return { organizationId: orgBySub.id };
  }
  return null;
}

export async function getBrandingForOrganization(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      organizationBrands: { include: { brandProfile: true }, orderBy: { isPrimary: "desc" } },
    },
  });
  if (!org) return null;
  const primaryBrand = org.organizationBrands.find((b: any) => b.isPrimary)?.brandProfile;
  return {
    primaryColor: primaryBrand?.primaryColor ?? org.brandingPrimaryColor ?? "#5b6bff",
    secondaryColor: primaryBrand?.secondaryColor ?? org.brandingSecondaryColor ?? "#3dd5a7",
    logoUrl: primaryBrand?.logoUrl ?? org.brandingLogoUrl,
    faviconUrl: primaryBrand?.faviconUrl ?? org.brandingFaviconUrl,
    whiteLabel: org.whiteLabelEnabled,
  };
}
