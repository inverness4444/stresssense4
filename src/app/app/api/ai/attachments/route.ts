import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/apiAuth";
import { getCurrentUser } from "@/lib/auth";
import { normalizeRole } from "@/lib/roles";
import { getBillingGateStatus } from "@/lib/billingGate";
import { env } from "@/config/env";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import OpenAI from "openai";
import { createReadStream, createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const blockedExtensions = [
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
  ".mkv",
];

const sanitizeFilename = (name: string) => {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "file";
};

const isBlockedFile = (file: File) => {
  const type = file.type || "";
  if (type.startsWith("audio/") || type.startsWith("video/")) return true;
  const lower = file.name.toLowerCase();
  return blockedExtensions.some((ext) => lower.endsWith(ext));
};

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  const role = normalizeRole(user?.role);
  if (!user || !["ADMIN", "HR", "MANAGER", "SUPER_ADMIN", "EMPLOYEE"].includes(role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const orgCreatedAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : undefined;
  const gateStatus = await getBillingGateStatus(user.organizationId, orgCreatedAt);
  if (!gateStatus.hasPaidAccess && !env.isDev) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`ai-attachments:${user.id}:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  type AttachmentRecord = {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    storageKey: string;
    openaiFileId: string | null;
  };

  const storageRoot = path.join(process.cwd(), "public", "ai-uploads", user.organizationId, user.id);
  await mkdir(storageRoot, { recursive: true });
  const attachments: AttachmentRecord[] = [];

  let openaiClient: OpenAI | null = null;
  if (env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  for (const file of files) {
    if (isBlockedFile(file)) {
      return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
    }
    const safeName = sanitizeFilename(file.name || "file");
    const id = crypto.randomUUID();
    const storageName = `${id}-${safeName}`;
    const filePath = path.join(storageRoot, storageName);
    const writeStream = createWriteStream(filePath);
    await pipeline(Readable.fromWeb(file.stream() as any), writeStream);

    let openaiFileId: string | null = null;
    if (openaiClient) {
      try {
        const uploaded = await openaiClient.files.create({
          file: createReadStream(filePath),
          purpose: "assistants",
        });
        openaiFileId = uploaded.id;
      } catch (err) {
        console.error("AI file upload failed", err);
      }
    }

    attachments.push({
      id,
      name: file.name || safeName,
      type: file.type || "application/octet-stream",
      size: file.size,
      url: `/ai-uploads/${user.organizationId}/${user.id}/${storageName}`,
      storageKey: `${user.organizationId}/${user.id}/${storageName}`,
      openaiFileId,
    });
  }

  return NextResponse.json({ attachments });
}
