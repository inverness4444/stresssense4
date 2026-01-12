import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/apiAuth";
import { randomUUID } from "crypto";

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  storageKey: string;
  openaiFileId?: string | null;
};

type Message = { id: string; role: "ai" | "user"; text: string; suggested?: string[]; attachments?: Attachment[] };
type Session = { id: string; title: string; messages: Message[] };

type IncomingMessage = { id?: unknown; role?: unknown; text?: unknown; suggested?: unknown; attachments?: unknown };
type IncomingSession = { id?: unknown; title?: unknown; messages?: unknown };

type Payload = { sessions?: IncomingSession[]; activeSessionId?: string | null };

const MAX_SESSIONS = 50;
const MAX_MESSAGES = 200;
const MAX_ATTACHMENTS = 12;
const MAX_TEXT_LENGTH = 4000;

function safeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_TEXT_LENGTH);
}

function sanitizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((att: any) => {
      const name = safeText(att?.name) || "";
      const type = safeText(att?.type) || "";
      const url = safeText(att?.url) || "";
      const storageKey = safeText(att?.storageKey) || "";
      if (!name || !url || !storageKey) return null;
      const id = typeof att?.id === "string" ? att.id : randomUUID();
      const size =
        typeof att?.size === "number" && Number.isFinite(att.size) && att.size > 0 ? Math.floor(att.size) : 0;
      const openaiFileId = typeof att?.openaiFileId === "string" ? att.openaiFileId.slice(0, 200) : null;
      return { id, name, type, size, url, storageKey, openaiFileId };
    })
    .filter(Boolean)
    .slice(0, MAX_ATTACHMENTS) as Attachment[];
}

function sanitizeMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((msg: IncomingMessage) => {
      const role = msg?.role === "ai" || msg?.role === "user" ? msg.role : "user";
      const text = safeText(msg?.text);
      const attachments = sanitizeAttachments(msg?.attachments);
      if (!text && attachments.length === 0) return null;
      const suggested = Array.isArray(msg?.suggested)
        ? msg?.suggested.filter((item) => typeof item === "string").slice(0, 8)
        : undefined;
      const id = typeof msg?.id === "string" ? msg.id : randomUUID();
      return { id, role, text, suggested, attachments: attachments.length ? attachments : undefined } as Message;
    })
    .filter(Boolean)
    .slice(-MAX_MESSAGES) as Message[];
}

function sanitizeSessions(input: unknown): Session[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((session: IncomingSession) => {
      const id = typeof session?.id === "string" ? session.id : randomUUID();
      const title = safeText(session?.title) || "";
      const messages = sanitizeMessages(session?.messages);
      if (messages.length === 0) return null;
      return { id, title, messages } as Session;
    })
    .filter(Boolean)
    .slice(0, MAX_SESSIONS) as Session[];
}

export async function GET(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  try {
    const record = await prisma.aiChatState.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
    });
    return NextResponse.json({
      sessions: (record as any)?.sessions ?? [],
      activeSessionId: (record as any)?.activeSessionId ?? null,
    });
  } catch {
    return NextResponse.json({ sessions: [], activeSessionId: null });
  }
}

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Payload | null;
  const sessions = sanitizeSessions(body?.sessions ?? []);
  const activeSessionId =
    typeof body?.activeSessionId === "string" && sessions.some((s) => s.id === body?.activeSessionId)
      ? body?.activeSessionId
      : sessions[0]?.id ?? null;

  try {
    await prisma.aiChatState.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
      create: {
        userId: user.id,
        organizationId: user.organizationId,
        sessions,
        activeSessionId,
      },
      update: {
        sessions,
        activeSessionId,
      },
    });
  } catch {
    // ignore if aiChatState model isn't available
  }

  return NextResponse.json({ ok: true });
}
