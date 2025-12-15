import { env } from "@/config/env";

const SLACK_API = "https://slack.com/api";

export function getSlackAuthUrl(organizationId: string, stateToken: string) {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID || "",
    scope: "chat:write,users:read,im:write,chat:write.public",
    redirect_uri: env.SLACK_REDIRECT_URI || "",
    state: `${organizationId}:${stateToken}`,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCodeForToken(code: string) {
  const params = new URLSearchParams({
    code,
    client_id: env.SLACK_CLIENT_ID || "",
    client_secret: env.SLACK_CLIENT_SECRET || "",
    redirect_uri: env.SLACK_REDIRECT_URI || "",
  });
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json();
  if (!data.ok) throw new Error("Slack OAuth failed");
  return data;
}

export async function sendSlackDM({ accessToken, slackUserId, text }: { accessToken: string; slackUserId: string; text: string }) {
  await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: slackUserId, text }),
  });
}

export async function postSlackMessageToChannel({
  accessToken,
  channelId,
  text,
}: {
  accessToken: string;
  channelId: string;
  text: string;
}) {
  await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: channelId, text }),
  });
}
