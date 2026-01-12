import { ADMIN_LIKE_ROLES } from "@/lib/roles";

export const MIN_TEAM_SIZE_FOR_ANON = 5;

export const ANON_CATEGORIES = [
  "communication",
  "workload",
  "process",
  "culture",
  "conflict",
  "ideas",
] as const;

export type AnonymousFeedbackCategory = (typeof ANON_CATEGORIES)[number];

export function rotationBucket(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatAnonHandle(index: number) {
  return `Anon #${index}`;
}

export function canSendAnonToLeader(teamSize: number) {
  return teamSize >= MIN_TEAM_SIZE_FOR_ANON;
}

export function normalizeTags(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean);
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phoneRegex = /\+?\d[\d\s().-]{7,}\d/;

export function containsPii(text: string) {
  return emailRegex.test(text) || phoneRegex.test(text);
}

export function isValidCategory(value: string): value is AnonymousFeedbackCategory {
  return ANON_CATEGORIES.includes(value as AnonymousFeedbackCategory);
}

export function sanitizeFeedbackForLeader<T extends Record<string, any>>(feedback: T) {
  const cleaned = { ...feedback };
  delete (cleaned as any).senderUserId;
  delete (cleaned as any).senderUser;
  return cleaned;
}

export function sanitizeThreadForLeader<T extends Record<string, any>>(thread: T) {
  const cleaned = { ...thread };
  if (cleaned.feedback && typeof cleaned.feedback === "object") {
    cleaned.feedback = sanitizeFeedbackForLeader(cleaned.feedback);
  }
  return cleaned;
}

export function isAdminLikeRole(role?: string | null) {
  return ADMIN_LIKE_ROLES.includes((role ?? "").toUpperCase() as (typeof ADMIN_LIKE_ROLES)[number]);
}
