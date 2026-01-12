'use server';

import crypto from "crypto";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSlackAuthUrl, exchangeSlackCodeForToken } from "@/lib/slack";
import { ensureOrgSettings } from "@/lib/access";

export async function disconnectSlack() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/signin");
  }
  await prisma.slackIntegration.deleteMany({ where: { organizationId: user.organizationId } });
  await prisma.organizationSettings.update({
    where: { organizationId: user.organizationId },
    data: { slackEnabled: false, slackAlertsChannelId: null },
  });
  redirect("/app/integrations");
}

export async function getSlackConnectUrl() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return { error: "No access" };
  const state = crypto.randomBytes(16).toString("hex");
  return { url: getSlackAuthUrl(user.organizationId, state) };
}

export async function saveSlackChannel(channelId: string) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return { error: "No access" };
  await ensureOrgSettings(user.organizationId);
  await prisma.organizationSettings.update({
    where: { organizationId: user.organizationId },
    data: { slackAlertsChannelId: channelId },
  });
  return { success: true };
}

export async function handleSlackCallback(code: string, organizationId: string) {
  const data = await exchangeSlackCodeForToken(code);
  if (!data?.authed_user?.access_token && !data.access_token) return { error: "Slack auth failed" };
  await prisma.slackIntegration.upsert({
    where: { organizationId },
    update: {
      accessToken: data.access_token,
      botUserId: data.bot_user_id,
      teamId: data.team?.id,
      teamName: data.team?.name,
    },
    create: {
      organizationId,
      accessToken: data.access_token,
      botUserId: data.bot_user_id,
      teamId: data.team?.id,
      teamName: data.team?.name,
    },
  });
  await prisma.organizationSettings.update({
    where: { organizationId },
    data: { slackEnabled: true },
  });
  return { success: true };
}
