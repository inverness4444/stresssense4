import { prisma } from "./prisma";
import { randomBytes } from "crypto";
import { env } from "@/config/env";
import { getBaseUrl } from "@/lib/url";

type RedirectResult = { url: string };

export async function getSSOConfigForEmail(email: string) {
  const domain = email.split("@")[1];
  const org = await prisma.organization.findFirst({
    where: { users: { some: { email: { endsWith: `@${domain}` } } } },
    include: { ssoConfig: true },
  });
  const cfg = (org as any)?.ssoConfig;
  if (!cfg || !cfg.isEnabled) return null;
  return { org, config: cfg };
}

export function buildOidcRedirect(config: any, orgId: string) {
  const state = Buffer.from(JSON.stringify({ orgId, nonce: randomBytes(8).toString("hex") })).toString("base64url");
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams({
    client_id: config.oidcClientId!,
    response_type: "code",
    redirect_uri: `${baseUrl}/auth/sso/callback`,
    scope: config.oidcScope ?? "openid profile email",
    state,
  });
  return `${config.ssoUrl ?? config.oidcTokenUrl ?? ""}?${params.toString()}`;
}

export function buildSamlRedirect(config: any, orgId: string) {
  // For MVP: pretend to build an AuthnRequest; in real life use saml library
  const request = Buffer.from(`<AuthnRequest Issuer="${config.issuer ?? "stresssense"}" />`).toString("base64");
  const relay = Buffer.from(JSON.stringify({ orgId })).toString("base64url");
  return `${config.ssoUrl}?SAMLRequest=${encodeURIComponent(request)}&RelayState=${relay}`;
}

export async function getRedirectUrl(orgId: string) {
  const config = await prisma.sSOConfig.findUnique({ where: { organizationId: orgId } });
  if (!config || !config.isEnabled) throw new Error("SSO not enabled");
  if (config.providerType === "oidc") return buildOidcRedirect(config, orgId);
  return buildSamlRedirect(config, orgId);
}

export async function handleOidcCallback(code: string, state: string) {
  const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  const orgId = decoded.orgId as string;
  const config = await prisma.sSOConfig.findUnique({ where: { organizationId: orgId } });
  if (!config) throw new Error("SSO config missing");

  const baseUrl = getBaseUrl();
  const tokenRes = await fetch(config.oidcTokenUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/auth/sso/callback`,
      client_id: config.oidcClientId ?? "",
      client_secret: config.oidcClientSecret ?? "",
    }),
  });
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string;
  const userRes = await fetch(config.oidcUserInfoUrl!, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userInfo = await userRes.json();
  return { orgId, userInfo, config };
}

// For SAML MVP: trust SAMLResponse payload for email/name
export function parseSamlResponse(samlResponse: string) {
  const xml = Buffer.from(samlResponse, "base64").toString("utf8");
  const emailMatch = xml.match(/<Email>(.*?)<\/Email>/i);
  const nameMatch = xml.match(/<Name>(.*?)<\/Name>/i);
  return { email: emailMatch?.[1], name: nameMatch?.[1] };
}
