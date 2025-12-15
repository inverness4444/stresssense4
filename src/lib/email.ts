import nodemailer from "nodemailer";
import { env } from "@/config/env";

type InvitePayload = {
  to: string;
  orgName: string;
  surveyName: string;
  surveyUrl: string;
  variantKey?: string;
};

function getTransport() {
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT ? Number(env.SMTP_PORT) : 587;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASSWORD;
  const secure = env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function sender() {
  return env.EMAIL_FROM || "StressSense <no-reply@stresssense.app>";
}

export async function sendSurveyInviteEmail(payload: InvitePayload) {
  const transport = getTransport();
  if (!transport) {
    console.warn("Email transport not configured. Skipping invite send.");
    return { skipped: true };
  }

  const subject = `Your company is running a quick stress pulse${payload.variantKey ? " [" + payload.variantKey + "]" : ""}`;
  const text = [
    `Hi there,`,
    ``,
    `${payload.orgName} is asking for a quick, anonymous stress pulse: "${payload.surveyName}".`,
    `It takes about 2 minutes. Your answers are aggregated and anonymous.`,
    ``,
    `Start here: ${payload.surveyUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #0f172a; background: #f8fafc;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
        <p style="font-size: 14px; color: #475569; margin: 0 0 8px;">StressSense</p>
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a;">Your company is running a quick stress pulse</h2>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">
          ${payload.orgName} invited you to share how work feels in a short, anonymous stress pulse: <strong>${payload.surveyName}</strong>.
        </p>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">It takes 2–3 minutes. Results are aggregated and anonymous.</p>
        <a href="${payload.surveyUrl}" style="display: inline-block; margin-bottom: 16px; background: linear-gradient(90deg, #5b6bff, #6f7dff); color: white; text-decoration: none; padding: 12px 18px; border-radius: 9999px; font-weight: 600;">Open survey</a>
        <p style="margin: 0; font-size: 13px; color: #475569;">If the button doesn't work, paste this link into your browser:<br /><a href="${payload.surveyUrl}" style="color: #5b6bff;">${payload.surveyUrl}</a></p>
      </div>
    </div>
  `;

  await transport.sendMail({
    from: sender(),
    to: payload.to,
    subject,
    text,
    html,
  });

  return { success: true };
}

export async function sendSurveyReminderEmail(payload: InvitePayload) {
  const transport = getTransport();
  if (!transport) {
    console.warn("Email transport not configured. Skipping reminder send.");
    return { skipped: true };
  }

  const subject = `Reminder: share how work feels this week${payload.variantKey ? " [" + payload.variantKey + "]" : ""}`;
  const text = [
    `Hi there,`,
    ``,
    `Reminder to share how work feels in "${payload.surveyName}" from ${payload.orgName}.`,
    `It takes about 2 minutes and helps keep results accurate.`,
    ``,
    `Start here: ${payload.surveyUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #0f172a; background: #f8fafc;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
        <p style="font-size: 14px; color: #475569; margin: 0 0 8px;">StressSense</p>
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a;">Reminder: share how work feels this week</h2>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
          Quick reminder to complete <strong>${payload.surveyName}</strong> from ${payload.orgName}. It only takes a couple of minutes. Responses stay anonymous and are shared in aggregate.
        </p>
        <a href="${payload.surveyUrl}" style="display: inline-block; margin-bottom: 16px; background: linear-gradient(90deg, #5b6bff, #6f7dff); color: white; text-decoration: none; padding: 12px 18px; border-radius: 9999px; font-weight: 600;">Open survey</a>
        <p style="margin: 0; font-size: 13px; color: #475569;">If the button doesn't work, paste this link into your browser:<br /><a href="${payload.surveyUrl}" style="color: #5b6bff;">${payload.surveyUrl}</a></p>
      </div>
    </div>
  `;

  await transport.sendMail({
    from: sender(),
    to: payload.to,
    subject,
    text,
    html,
  });

  return { success: true };
}

export function isEmailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}
