import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  DATABASE_URL_EU: z.string().url().optional(),
  DATABASE_URL_US: z.string().url().optional(),
  DATABASE_URL_APAC: z.string().url().optional(),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be set and at least 16 characters").default("dev-session-secret-placeholder"),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be set and at least 16 characters").default("dev-nextauth-secret"),
  BOOTSTRAP_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  DEMO_ORG_ID: z.string().optional(),
  DEMO_HR_USER_ID: z.string().optional(),
  DEMO_MANAGER_USER_ID: z.string().optional(),
  FEATURE_FLAGS: z.string().optional(),
  SCHEDULE_TRIGGER_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().optional(),
  AI_PROVIDER: z.enum(["openai", "none"]).default("none"),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL_SUMMARY: z.string().optional(),
  AI_MODEL_SUMMARY_FALLBACK: z.string().optional(),
  AI_MODEL_ASSISTANT: z.string().optional(),
  AI_MODEL_ASSISTANT_VISION: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  QUEUE_CONCURRENCY: z.coerce.number().optional(),
  DWH_TYPE: z.string().optional(),
  DWH_CONNECTION_STRING: z.string().optional(),
  DWH_EXPORT_ENABLED: z.coerce.boolean().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

const serverEnv = serverSchema.parse(process.env);
const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

const featureFlags = (() => {
  if (!serverEnv.FEATURE_FLAGS) return {};
  try {
    return JSON.parse(serverEnv.FEATURE_FLAGS);
  } catch (e) {
    console.warn("Invalid FEATURE_FLAGS JSON, ignoring.", e);
    return {};
  }
})();

export const env = {
  ...serverEnv,
  client: clientEnv,
  featureFlags,
  isDev: serverEnv.NODE_ENV !== "production",
};

if (!env.isDev) {
  if (env.SESSION_SECRET === "dev-session-secret-placeholder") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  if (env.NEXTAUTH_SECRET === "dev-nextauth-secret") {
    throw new Error("NEXTAUTH_SECRET must be set in production.");
  }
}

if (env.AI_PROVIDER === "openai") {
  const missing = [];
  if (!env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!env.AI_MODEL_SUMMARY) missing.push("AI_MODEL_SUMMARY");
  if (!env.AI_MODEL_ASSISTANT) missing.push("AI_MODEL_ASSISTANT");
  if (missing.length) {
    const message = `AI_PROVIDER=openai but missing env: ${missing.join(", ")}`;
    if (env.isDev) {
      throw new Error(message);
    } else {
      console.error(message);
    }
  }
}
