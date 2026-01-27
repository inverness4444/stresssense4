import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { env } from "@/config/env";
import { headers } from "next/headers";
import { assertSameOrigin } from "@/lib/apiAuth";
import { normalizeRole } from "@/lib/roles";
import { getBillingGateStatus } from "@/lib/billingGate";
import path from "path";
import { createReadStream } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import crypto from "crypto";
import { mockAiRespond, type AiContextData, type AiContextType } from "@/lib/ai/mockAiClient";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TEXT_MIME_TYPES = new Set(["application/json", "application/xml", "text/xml"]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".xml"]);
const IMAGE_EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type AttachmentKind = "image" | "pdf" | "text" | "unsupported";

const sanitizeFilename = (name: string) => {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "file";
};

const resolveAttachmentKind = (file: File) => {
  const type = file.type || "";
  const ext = path.extname(file.name || "").toLowerCase();
  if (type.startsWith("audio/") || type.startsWith("video/")) {
    return { kind: "unsupported" as AttachmentKind, mime: type || "application/octet-stream" };
  }
  if (SUPPORTED_IMAGE_TYPES.has(type)) {
    return { kind: "image" as AttachmentKind, mime: type };
  }
  if (!type && IMAGE_EXT_TO_MIME[ext]) {
    return { kind: "image" as AttachmentKind, mime: IMAGE_EXT_TO_MIME[ext] };
  }
  if (type === "application/pdf" || ext === ".pdf") {
    return { kind: "pdf" as AttachmentKind, mime: "application/pdf" };
  }
  if ((type && type.startsWith("text/")) || TEXT_MIME_TYPES.has(type)) {
    return { kind: "text" as AttachmentKind, mime: type || "text/plain" };
  }
  if (!type && TEXT_EXTENSIONS.has(ext)) {
    return { kind: "text" as AttachmentKind, mime: "text/plain" };
  }
  return { kind: "unsupported" as AttachmentKind, mime: type || "application/octet-stream" };
};

const describeOpenAiError = (error: unknown, locale: "ru" | "en") => {
  const message =
    typeof (error as any)?.error?.message === "string"
      ? (error as any).error.message
      : typeof (error as any)?.message === "string"
        ? (error as any).message
        : "";
  if (message && env.isDev) return message;
  return locale === "ru"
    ? "Ошибка OpenAI. Проверьте ключ API и доступ к модели."
    : "OpenAI request failed. Check your API key and model access.";
};

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;
  const user = await getCurrentUser();
  const role = normalizeRole(user?.role);
  const allowedRoles = new Set(["ADMIN", "HR", "MANAGER", "SUPER_ADMIN", "EMPLOYEE"]);
  if (!user || !allowedRoles.has(role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const orgCreatedAt = (user as any)?.organization?.createdAt ? new Date((user as any).organization.createdAt) : undefined;
  const gateStatus = await getBillingGateStatus(user.organizationId, orgCreatedAt, { userRole: user.role });
  if (!gateStatus.hasPaidAccess && !env.isDev) {
    return NextResponse.json({ error: "payment_required", disabled: true }, { status: 402 });
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`ai-chat:${user.id}:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limiter.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const normalizeMessages = (input: any) => {
    if (!Array.isArray(input)) return [];
    return input
      .map((msg: any) => {
        const role = msg?.role === "assistant" ? "assistant" : "user";
        const content = typeof msg?.content === "string" ? msg.content : "";
        const attachments = Array.isArray(msg?.attachments) ? msg.attachments : undefined;
        if (!content && (!attachments || attachments.length === 0)) return null;
        return { role, content, attachments };
      })
      .filter(Boolean) as {
      role: "user" | "assistant";
      content: string;
      attachments?: {
        id?: string;
        name?: string;
        type?: string;
        size?: number;
        url?: string;
        storageKey?: string;
        openaiFileId?: string | null;
      }[];
    }[];
  };

  const contentType = req.headers.get("content-type") || "";
  let messages: {
    role: "user" | "assistant";
    content: string;
    attachments?: {
      id?: string;
      name?: string;
      type?: string;
      size?: number;
      url?: string;
      storageKey?: string;
      openaiFileId?: string | null;
    }[];
  }[] = [];
  let locale: "ru" | "en" = "en";
  let contextType: AiContextType = "demo";
  let contextData: AiContextData = {};
  let attachmentFile: File | null = null;
  let rawMessage = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: "Invalid form data", errorCode: "invalid_form" }, { status: 400 });
    const messageValue = formData.get("message");
    rawMessage = typeof messageValue === "string" ? messageValue : "";
    const messagesValue = formData.get("messages");
    if (typeof messagesValue === "string" && messagesValue.trim()) {
      try {
        messages = normalizeMessages(JSON.parse(messagesValue));
      } catch {
        messages = [];
      }
    }
    if (messages.length === 0 && rawMessage.trim()) {
      messages = [{ role: "user", content: rawMessage.trim() }];
    }
    const localeValue = formData.get("locale");
    locale = localeValue === "ru" ? "ru" : "en";
    const contextTypeValue = formData.get("contextType");
    if (typeof contextTypeValue === "string" && contextTypeValue) {
      contextType = contextTypeValue as AiContextType;
    }
    const contextDataValue = formData.get("contextData");
    if (typeof contextDataValue === "string" && contextDataValue.trim()) {
      try {
        contextData = JSON.parse(contextDataValue) as AiContextData;
      } catch {
        contextData = {};
      }
    }
    const attachments = formData.getAll("attachment").filter((item): item is File => item instanceof File);
    if (attachments.length > 1) {
      return NextResponse.json(
        { error: "Only one attachment is supported", errorCode: "multiple_attachments" },
        { status: 400 }
      );
    }
    attachmentFile = attachments[0] ?? null;
  } else {
    const body = (await req.json().catch(() => null)) as
      | {
          messages?: {
            role: "user" | "assistant";
            content: string;
            attachments?: {
              id?: string;
              name?: string;
              type?: string;
              size?: number;
              url?: string;
              storageKey?: string;
              openaiFileId?: string | null;
            }[];
          }[];
          locale?: string;
          contextType?: AiContextType;
          contextData?: AiContextData;
        }
      | null;
    messages = normalizeMessages(body?.messages ?? []);
    locale = body?.locale === "ru" ? "ru" : "en";
    contextType = body?.contextType ?? "demo";
    contextData = body?.contextData ?? {};
  }

  const teamIds =
    role === "MANAGER"
      ? (
          await prisma.userTeam.findMany({
            where: { userId: user.id },
            select: { teamId: true },
          })
        ).map((t: any) => t.teamId)
      : [];

  let surveyRuns: any[] = [];
  if (role === "EMPLOYEE") {
    const memberId = user.member?.id;
    if (memberId) {
      surveyRuns = await prisma.surveyRun.findMany({
        where: {
          orgId: user.organizationId,
          memberId,
        },
        orderBy: { launchedAt: "desc" },
        take: 5,
        include: {
          responses: true,
          template: { include: { questions: true } },
          team: true,
        },
      });
    }
  } else {
    surveyRuns = await prisma.surveyRun.findMany({
      where: {
        orgId: user.organizationId,
        ...(role === "MANAGER" && teamIds.length ? { teamId: { in: teamIds } } : {}),
      },
      orderBy: { launchedAt: "desc" },
      take: 5,
      include: {
        responses: true,
        template: { include: { questions: true } },
        team: true,
      },
    });
  }

  const getScaleValues = (answers: any) => {
    if (!answers) return [];
    const list = Array.isArray(answers) ? answers : Object.values(answers);
    return list
      .map((a: any) => {
        if (typeof a?.scaleValue === "number") return a.scaleValue;
        if (typeof a?.value === "number") return a.value;
        return null;
      })
      .filter((v: number | null): v is number => v != null && !Number.isNaN(v));
  };

  const surveyContext = surveyRuns
    .map((run: any) => {
      const responseCount = run.responses.length;
      const inviteCount = run.targetCount || responseCount;
      const avg =
        responseCount > 0
          ? run.responses.reduce((acc: number, r: any) => {
              const vals = getScaleValues(r.answers);
              if (!vals.length) return acc;
              return acc + vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
            }, 0) / responseCount
          : null;
      const teamLabel = run.team?.name ? `, team "${run.team.name}"` : "";
      return `Survey "${run.title}"${teamLabel}, responses ${responseCount}/${inviteCount}${
        avg != null ? `, avg scale ${avg.toFixed(2)}` : ""
      }`;
    })
    .join("\n");

  const contextLabel =
    role === "EMPLOYEE"
      ? locale === "ru"
        ? "Контекст по вашим опросам"
        : "Your survey context"
      : locale === "ru"
        ? "Контекст по организации"
        : "Organization context";
  const contextMessage =
    locale === "ru"
      ? `${contextLabel}:\n${surveyContext || "Нет недавних опросов."}`
      : `${contextLabel}:\n${surveyContext || "No recent surveys."}`;

  const systemPrompt =
    locale === "ru"
      ? "Ты помощник по рабочему стрессу и вовлечённости. Используй только контекст ниже. Не выдумывай цифры и факты. Если данных нет, прямо скажи об этом и дай общие рекомендации без чисел. Если пользователь приложил файл или изображение, обязательно упомяни это и ответь по содержимому; если содержания недостаточно, задай уточняющий вопрос."
      : "You are a work stress and engagement assistant. Use only the context below. Do not invent numbers or facts. If data is missing, say so and give general guidance without numbers. If the user attached a file or image, explicitly acknowledge it and respond based on its contents; if unclear, ask a follow-up question.";

  const storageRoot = path.join(process.cwd(), "public", "ai-uploads");
  const allowedPrefix = `${user.organizationId}/${user.id}/`;

  const isTextLike = (type: string, name: string) => {
    if (type.startsWith("text/")) return true;
    const lower = name.toLowerCase();
    if (TEXT_MIME_TYPES.has(type)) return true;
    for (const ext of TEXT_EXTENSIONS) {
      if (lower.endsWith(ext)) return true;
    }
    return false;
  };

  const buildUserContent = async (
    content: string,
    attachments?: {
      name?: string;
      type?: string;
      storageKey?: string;
      openaiFileId?: string | null;
    }[]
  ) => {
    const parts: any[] = [];
    if (content?.trim()) {
      parts.push({ type: "input_text", text: content });
    }
    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        const name = att?.name || "file";
        const type = att?.type || "application/octet-stream";
        const storageKey = att?.storageKey;
        if (storageKey && storageKey.startsWith(allowedPrefix)) {
          const filePath = path.join(storageRoot, storageKey);
          const normalized = path.normalize(filePath);
          if (normalized.startsWith(storageRoot)) {
            try {
              if (type.startsWith("image/")) {
                const buffer = await readFile(normalized);
                const base64 = buffer.toString("base64");
                parts.push({ type: "input_text", text: `Image: ${name}` });
                parts.push({ type: "input_image", image_url: `data:${type};base64,${base64}`, detail: "auto" });
                continue;
              }
              if (att?.openaiFileId) {
                parts.push({ type: "input_text", text: `File: ${name}` });
                parts.push({ type: "input_file", file_id: att.openaiFileId });
                continue;
              }
              if (isTextLike(type, name)) {
                const buffer = await readFile(normalized);
                const text = buffer.toString("utf8").slice(0, 4000);
                parts.push({ type: "input_text", text: `File ${name}:\n${text}` });
                continue;
              }
            } catch {
              // fallback below
            }
          }
        }
        parts.push({ type: "input_text", text: `Attached file: ${name}` });
      }
    }
    return parts.length > 0 ? parts : [{ type: "input_text", text: content || "" }];
  };

  const buildAttachmentSummary = async (
    attachments?: {
      name?: string;
      type?: string;
      storageKey?: string;
    }[]
  ) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return "";
    const chunks: string[] = [];
    for (const att of attachments) {
      const name = att?.name || "file";
      const type = att?.type || "application/octet-stream";
      const storageKey = att?.storageKey;
      if (storageKey && storageKey.startsWith(allowedPrefix)) {
        const filePath = path.join(storageRoot, storageKey);
        const normalized = path.normalize(filePath);
        if (normalized.startsWith(storageRoot)) {
          if (type.startsWith("image/")) {
            chunks.push(`${locale === "ru" ? "Изображение" : "Image"}: ${name}`);
            continue;
          }
          if (isTextLike(type, name)) {
            try {
              const buffer = await readFile(normalized);
              const text = buffer.toString("utf8").slice(0, 4000);
              chunks.push(`${locale === "ru" ? "Файл" : "File"} ${name}:\n${text}`);
              continue;
            } catch {
              // fallback below
            }
          }
        }
      }
      chunks.push(`${locale === "ru" ? "Файл" : "File"}: ${name}`);
    }
    return chunks.join("\n\n");
  };

  const inferAttachmentKindFromMessages = (
    attachments?: {
      name?: string;
      type?: string;
    }[]
  ) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return null;
    if (attachments.some((att) => (att?.type || "").startsWith("image/"))) return "image" as AttachmentKind;
    if (
      attachments.some(
        (att) =>
          (att?.type || "").includes("pdf") || (att?.name || "").toLowerCase().trim().endsWith(".pdf")
      )
    ) {
      return "pdf" as AttachmentKind;
    }
    if (attachments.some((att) => isTextLike(att?.type || "", att?.name || ""))) return "text" as AttachmentKind;
    return null;
  };

  const buildAttachmentInstruction = (kind: AttachmentKind | null) => {
    if (!kind || kind === "unsupported") return "";
    if (kind === "image") {
      return locale === "ru"
        ? "Пользователь приложил изображение. Проанализируй его и отвечай на вопрос пользователя, опираясь на видимые детали. Если что-то не читается или неясно, скажи об этом и задай уточняющий вопрос."
        : "The user attached an image. Analyze it and answer based on visible details. If something is unclear or unreadable, say so and ask a follow-up question.";
    }
    if (kind === "pdf") {
      return locale === "ru"
        ? "Пользователь приложил PDF-документ. В начале ответа коротко подтвердите, что документ получен. Затем отвечайте только по содержимому документа, ссылаясь на найденные места или факты. Если в документе нет нужных данных, честно скажите об этом."
        : "The user attached a PDF document. Start by briefly confirming the document was received, then answer only from the document's contents with references to relevant sections or facts. If the document lacks the needed data, say so.";
    }
    if (kind === "text") {
      return locale === "ru"
        ? "Пользователь приложил текстовый файл. Используй его содержимое в ответе и не выдумывай факты, которых там нет."
        : "The user attached a text file. Use its contents in the response and do not invent facts that aren't there.";
    }
    return "";
  };

  const buildFallbackResponse = async (attachmentNoteOverride?: string) => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const attachmentNote = attachmentNoteOverride ?? (await buildAttachmentSummary(lastUser?.attachments ?? []));
    const baseContent = rawMessage.trim() || lastUser?.content?.trim();
    const prompt = [baseContent, attachmentNote].filter(Boolean).join("\n\n");
    return mockAiRespond(prompt, contextType, { ...contextData, locale });
  };

  const hasAttachmentRequest =
    Boolean(attachmentFile) || messages.some((msg) => Array.isArray(msg.attachments) && msg.attachments.length > 0);
  const attachmentResolution = attachmentFile ? resolveAttachmentKind(attachmentFile) : null;
  if (attachmentFile) {
    if (!Number.isFinite(attachmentFile.size) || attachmentFile.size <= 0) {
      console.warn("AI chat attachment rejected", {
        reason: "empty_attachment",
        type: attachmentFile.type || "application/octet-stream",
        size: attachmentFile.size,
      });
      return NextResponse.json({ error: "Attachment is empty", errorCode: "empty_attachment" }, { status: 400 });
    }
    if (attachmentFile.size > MAX_ATTACHMENT_BYTES) {
      console.warn("AI chat attachment rejected", {
        reason: "file_too_large",
        type: attachmentFile.type || "application/octet-stream",
        size: attachmentFile.size,
      });
      return NextResponse.json(
        { error: "Attachment is too large (max 15 MB)", errorCode: "file_too_large" },
        { status: 413 }
      );
    }
    if (attachmentResolution?.kind === "unsupported") {
      console.warn("AI chat attachment rejected", {
        reason: "unsupported_type",
        type: attachmentFile.type || "application/octet-stream",
        size: attachmentFile.size,
      });
      return NextResponse.json(
        {
          error: "Unsupported file type. Please attach an image (PNG/JPG/WebP/GIF), a PDF, or a text file.",
          errorCode: "unsupported_type",
        },
        { status: 400 }
      );
    }
  }

  let attachmentMeta:
    | {
        id: string;
        name: string;
        type: string;
        size: number;
        url: string;
        storageKey: string;
        openaiFileId?: string | null;
      }
    | null = null;
  let attachmentKind: AttachmentKind | null = attachmentResolution?.kind ?? null;
  let attachmentParts: any[] = [];
  let attachmentFallbackNote = "";

  try {
    const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
    const baseModel = env.AI_MODEL_ASSISTANT ?? "gpt-5-mini";
    const fallbackVisionModel = env.AI_MODEL_ASSISTANT_VISION ?? "gpt-4o-mini";
    const shouldLogFallback = env.isDev && process.env.AI_DEBUG === "1";

    if (attachmentFile && attachmentResolution) {
      const startTime = Date.now();
      const safeName = sanitizeFilename(attachmentFile.name || "file");
      const attachmentId = crypto.randomUUID();
      const storageDir = path.join(storageRoot, user.organizationId, user.id);
      await mkdir(storageDir, { recursive: true });
      const storageName = `${attachmentId}-${safeName}`;
      const filePath = path.join(storageDir, storageName);
      const buffer = Buffer.from(await attachmentFile.arrayBuffer());
      await writeFile(filePath, buffer);
      const resolvedType = attachmentResolution.mime || attachmentFile.type || "application/octet-stream";

      attachmentMeta = {
        id: attachmentId,
        name: attachmentFile.name || safeName,
        type: resolvedType,
        size: attachmentFile.size,
        url: `/ai-uploads/${user.organizationId}/${user.id}/${storageName}`,
        storageKey: `${user.organizationId}/${user.id}/${storageName}`,
      };

      if (attachmentResolution.kind === "image") {
        const base64 = buffer.toString("base64");
        attachmentParts.push({
          type: "input_image",
          image_url: `data:${resolvedType};base64,${base64}`,
          detail: "auto",
        });
        attachmentFallbackNote = `${locale === "ru" ? "Изображение" : "Image"}: ${attachmentMeta.name}`;
      } else if (attachmentResolution.kind === "pdf") {
        attachmentFallbackNote = `${locale === "ru" ? "Документ" : "Document"}: ${attachmentMeta.name}`;
        if (client) {
          try {
            const uploaded = await client.files.create({
              file: createReadStream(filePath),
              purpose: "user_data",
            });
            attachmentMeta.openaiFileId = uploaded.id;
            attachmentParts.push({ type: "input_file", file_id: uploaded.id });
          } catch (err) {
            console.error("AI PDF upload failed", err);
            return NextResponse.json(
              { error: "OpenAI file upload failed", errorCode: "openai_upload_failed" },
              { status: 502 }
            );
          }
        }
      } else if (attachmentResolution.kind === "text") {
        const text = buffer.toString("utf8").slice(0, 4000);
        attachmentParts.push({ type: "input_text", text: `File ${attachmentMeta.name}:\n${text}` });
        attachmentFallbackNote = `${locale === "ru" ? "Файл" : "File"} ${attachmentMeta.name}:\n${text}`;
      }

      console.info("AI chat attachment processed", {
        kind: attachmentResolution.kind,
        type: attachmentMeta.type,
        size: attachmentMeta.size,
        ms: Date.now() - startTime,
      });
    }

    if (!client) {
      if (hasAttachmentRequest) {
        return NextResponse.json(
          {
            error:
              locale === "ru"
                ? "OpenAI не настроен для обработки вложений."
                : "OpenAI is not configured to process attachments.",
            errorCode: "openai_missing_key",
          },
          { status: 503 }
        );
      }
      const fallback = await buildFallbackResponse(attachmentFallbackNote);
      return NextResponse.json({
        text: fallback.text,
        suggested: fallback.suggested,
        attachments: attachmentMeta ? [attachmentMeta] : undefined,
      });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user") ?? { content: "", attachments: [] };
    const historyItems = messages
      .filter((m) => m !== lastUser)
      .slice(-6)
      .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${(m.content ?? "").trim()}`)
      .filter(Boolean);
    const historyText = historyItems.length ? `Conversation so far:\n${historyItems.join("\n")}\n\n` : "";
    const userText =
      rawMessage.trim() ||
      lastUser.content ||
      (locale === "ru" ? "Прикреплённый файл" : "Attached file");
    const contentWithHistory = `${historyText}${userText}`.trim();
    const inferredKind = attachmentKind ?? inferAttachmentKindFromMessages(lastUser.attachments ?? []);
    const attachmentInstruction = buildAttachmentInstruction(inferredKind);
    const instructions = [systemPrompt, attachmentInstruction, contextMessage].filter(Boolean).join("\n\n");
    const contentParts =
      attachmentParts.length > 0
        ? [{ type: "input_text", text: contentWithHistory }, ...attachmentParts]
        : await buildUserContent(contentWithHistory, lastUser.attachments ?? []);
    const enrichedMessages = [{ role: "user", content: contentParts }];

    const summarizeOutput = (response: any) => {
      const output = Array.isArray(response?.output) ? response.output : [];
      return output.map((item: any) => ({
        type: item?.type,
        contentTypes: Array.isArray(item?.content) ? item.content.map((part: any) => part?.type) : [],
      }));
    };

    const extractText = (response: any) => {
      const primaryText = response?.output_text ?? "";
      if (primaryText) return { text: primaryText, refusal: "" };
      const output = Array.isArray(response?.output) ? response.output : [];
      for (const item of output) {
        if (item?.type !== "message") continue;
        const content = item?.content;
        if (!Array.isArray(content)) continue;
        const found = content.find((part: any) => part?.type === "output_text" && typeof part?.text === "string");
        if (found?.text) return { text: found.text, refusal: "" };
        const refusal = content.find((part: any) => part?.type === "refusal" && typeof part?.refusal === "string");
        if (refusal?.refusal) return { text: "", refusal: refusal.refusal };
      }
      return { text: "", refusal: "" };
    };

    const runResponse = async (modelName: string) => {
      const response = await client.responses.create({
        model: modelName,
        instructions,
        input: enrichedMessages as ResponseInput,
        max_output_tokens: 500,
      });
      const { text, refusal } = extractText(response);
      return { response, text, refusal, model: modelName, status: response?.status };
    };

    let result: { response: any; text: string; refusal: string; model: string; status?: string };
    try {
      result = await runResponse(baseModel);
    } catch (err) {
      if (fallbackVisionModel && fallbackVisionModel !== baseModel) {
        console.warn("AI chat primary model failed, retrying with vision model", {
          model: baseModel,
          fallback: fallbackVisionModel,
        });
        result = await runResponse(fallbackVisionModel);
      } else {
        throw err;
      }
    }

    const needsFallback = !result.text && !result.refusal && result.status !== "completed";
    if (needsFallback && fallbackVisionModel && fallbackVisionModel !== result.model) {
      if (shouldLogFallback) {
        console.warn("AI chat empty response, retrying with fallback model", {
          model: result.model,
          fallback: fallbackVisionModel,
          status: result.status,
          output: summarizeOutput(result.response),
        });
      }
      result = await runResponse(fallbackVisionModel);
    }

    if (result.refusal) {
      return NextResponse.json({ text: result.refusal, attachments: attachmentMeta ? [attachmentMeta] : undefined });
    }

    if (!result.text.trim()) {
      if (hasAttachmentRequest) {
        return NextResponse.json(
          { error: describeOpenAiError(new Error("Empty response from OpenAI"), locale), errorCode: "openai_failed" },
          { status: 502 }
        );
      }
      const fallback = await buildFallbackResponse(attachmentFallbackNote);
      return NextResponse.json({
        text: fallback.text,
        suggested: fallback.suggested,
        attachments: attachmentMeta ? [attachmentMeta] : undefined,
      });
    }
    return NextResponse.json({ text: result.text, attachments: attachmentMeta ? [attachmentMeta] : undefined });
  } catch (e: any) {
    console.error("AI chat failed", e);
    if (hasAttachmentRequest) {
      return NextResponse.json(
        { error: describeOpenAiError(e, locale), errorCode: "openai_failed" },
        { status: 502 }
      );
    }
    try {
      const fallback = await buildFallbackResponse(attachmentFallbackNote);
      return NextResponse.json({
        text: fallback.text,
        suggested: fallback.suggested,
        attachments: attachmentMeta ? [attachmentMeta] : undefined,
      });
    } catch {
      return NextResponse.json({ error: "AI unavailable", disabled: true }, { status: 503 });
    }
  }
}
