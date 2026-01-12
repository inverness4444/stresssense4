"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { t as tKey, type Locale } from "@/lib/i18n";
import type { AiContextData, AiContextType } from "@/lib/ai/mockAiClient";

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  storageKey: string;
  openaiFileId?: string | null;
  previewUrl?: string;
  status?: "pending";
};

type PendingAttachment = {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  kind: "image" | "pdf" | "text";
  previewUrl?: string;
};

type Message = { id: string; role: "ai" | "user"; text: string; suggested?: string[]; attachments?: Attachment[] };
type ChatSession = { id: string; title: string; messages: Message[] };

type DrawerProps = {
  open: boolean;
  locale: Locale;
  contextType: AiContextType;
  contextData?: AiContextData;
  initialPrompt?: string;
  aiEnabled?: boolean;
  onClose: () => void;
};

function t(locale: Locale, en: string, ru: string) {
  return locale === "ru" ? ru : en;
}

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".xml"]);
const IMAGE_EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** index;
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const resolveFileKind = (file: File) => {
  const type = file.type || "";
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  if (type.startsWith("audio/") || type.startsWith("video/")) return { kind: "unsupported" as const, mime: type };
  if (IMAGE_TYPES.has(type)) return { kind: "image" as const, mime: type };
  if (!type && IMAGE_EXTENSIONS[ext]) return { kind: "image" as const, mime: IMAGE_EXTENSIONS[ext] };
  if (type === "application/pdf" || ext === ".pdf") return { kind: "pdf" as const, mime: "application/pdf" };
  if ((type && type.startsWith("text/")) || TEXT_TYPES.has(type)) return { kind: "text" as const, mime: type };
  if (!type && TEXT_EXTENSIONS.has(ext)) return { kind: "text" as const, mime: "text/plain" };
  return { kind: "unsupported" as const, mime: type || "application/octet-stream" };
};

const quickPrompts: Record<"employee" | "manager" | "admin", { en: string; ru: string }[]> = {
  employee: [
    { en: "How to ask for a focus block?", ru: "Как попросить фокус-блок без митингов?" },
    { en: "How to talk about overload?", ru: "Как обсудить перегруз с менеджером?" },
    { en: "Too many meetings this week", ru: "Слишком много митингов на неделе" },
  ],
  manager: [
    { en: "Which teams are at risk?", ru: "Какие команды в риске?" },
    { en: "Actions for stressed teams", ru: "Действия для перегруженных команд" },
    { en: "How to improve participation", ru: "Как повысить участие в опросах" },
  ],
  admin: [
    { en: "Survey cadence recommendations", ru: "Рекомендации по частоте опросов" },
    { en: "How to reduce stress trends", ru: "Как снизить тренды стресса" },
    { en: "Explain stress surveys to org", ru: "Как объяснить опросы по стрессу в орг" },
  ],
};

export function StressSenseAiDrawer({
  open,
  locale,
  contextType,
  contextData,
  initialPrompt,
  aiEnabled = true,
  onClose,
}: DrawerProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hydratedRef = useRef(false);

  const storageKey = useMemo(() => {
    const userKey = contextData?.userId ?? "anon";
    const orgKey = contextData?.organizationId ?? "org";
    return `stresssense_ai_sessions:${orgKey}:${userKey}`;
  }, [contextData?.organizationId, contextData?.userId]);

  const roleKey: "employee" | "manager" | "admin" =
    (contextData?.role?.toLowerCase().includes("employee") && "employee") ||
    (contextData?.role?.toLowerCase().includes("manager") && "manager") ||
    "admin";

  const defaultTitle = locale === "ru" ? "Новый чат" : "New chat";
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeMessages = activeSession?.messages ?? [];

  const placeholder = useMemo(() => {
    if (roleKey === "employee") {
      return t(
        locale,
        "Ask how to reduce your work stress or talk to your manager…",
        "Спросите, как снизить рабочий стресс или поговорить с менеджером…"
      );
    }
    return t(
      locale,
      "Ask about stress trends, at-risk teams, or next steps…",
      "Спросите про тренды стресса, команды в риске или следующие шаги…"
    );
  }, [locale, roleKey]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const buildWelcomeMessage = () => {
    const initialText =
      contextType === "employee_home"
        ? t(
            locale,
            "Ask me about work stress, focus time, or how to align expectations with your manager.",
            "Спросите про рабочий стресс, фокус-время или как договориться с менеджером о приоритетах."
          )
        : t(
            locale,
            "Ask about stress trends, teams in risk, or actions for this month.",
            "Спросите про тренды стресса, команды в риске или действия на этот месяц."
          );
    return { id: crypto.randomUUID(), role: "ai", text: initialText, suggested: undefined } as Message;
  };

  useEffect(() => {
    if (!open) return;
    hydratedRef.current = false;

    type PersistedState = { sessions: ChatSession[]; activeSessionId: string | null };

    const normalizeState = (sessions: ChatSession[], activeSessionId?: string | null): PersistedState | null => {
      if (!Array.isArray(sessions) || sessions.length === 0) return null;
      const activeId =
        activeSessionId && sessions.some((s) => s.id === activeSessionId) ? activeSessionId : sessions[0]?.id ?? null;
      return { sessions, activeSessionId: activeId };
    };

    const countMessages = (state: PersistedState) =>
      state.sessions.reduce((total, session) => total + session.messages.length, 0);

    const chooseState = (server: PersistedState | null, local: PersistedState | null) => {
      if (server && !local) return server;
      if (!server && local) return local;
      if (!server && !local) return null;
      return countMessages(local!) > countMessages(server!) ? local : server;
    };

    const loadFromLocal = (): PersistedState | null => {
      const storedRaw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (!storedRaw) return null;
      try {
        const stored = JSON.parse(storedRaw) as { sessions?: ChatSession[]; activeSessionId?: string | null };
        return normalizeState(stored.sessions ?? [], stored.activeSessionId ?? null);
      } catch {
        return null;
      }
    };

    const ensureDefaultSession = () => {
      const welcome = buildWelcomeMessage();
      const sessionId = crypto.randomUUID();
      setSessions([{ id: sessionId, title: defaultTitle, messages: [welcome] }]);
      setActiveSessionId(sessionId);
    };

    const loadFromServer = async (): Promise<PersistedState | null> => {
      try {
        const res = await fetch("/app/api/ai/sessions", { method: "GET" });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as { sessions?: ChatSession[]; activeSessionId?: string | null } | null;
        if (!data) return null;
        return normalizeState(data.sessions ?? [], data.activeSessionId ?? null);
      } catch {
        return null;
      }
    };

    const hydrate = async () => {
      const serverState = await loadFromServer();
      const localState = loadFromLocal();
      const selected = chooseState(serverState, localState);
      if (selected) {
        setSessions(selected.sessions);
        setActiveSessionId(selected.activeSessionId);
      } else {
        ensureDefaultSession();
      }
      hydratedRef.current = true;
    };

    void hydrate();
    setShowSidebar(true);
    setInput(initialPrompt ?? "");
    setLoading(false);
    if (aiEnabled) {
      setDisabled(false);
      setDisabledReason(null);
    } else {
      setDisabled(true);
      setDisabledReason(tKey(locale, "aiDisabledNoSubscription"));
    }
  }, [aiEnabled, defaultTitle, initialPrompt, locale, open, storageKey]);

  useEffect(() => {
    if (!open) return;
    if (!storageKey) return;
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    if (loading || uploadingAttachments) return;
    const hasPending = sessions.some((session) =>
      session.messages.some((message) => message.attachments?.some((att) => att.status === "pending"))
    );
    if (hasPending) return;
    const payload = JSON.stringify({ sessions, activeSessionId });
    window.localStorage.setItem(storageKey, payload);
    const timeout = window.setTimeout(() => {
      fetch("/app/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {});
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeSessionId, loading, open, sessions, storageKey, uploadingAttachments]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeMessages]);

  const clearPendingAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const setPendingFromFile = (file: File) => {
    if (disabled || loading || uploadingAttachments) return;
    if (!Number.isFinite(file.size) || file.size <= 0) {
      setUploadError(t(locale, "File is empty.", "Файл пустой."));
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError(
        t(
          locale,
          `File is too large. Max size is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
          `Файл слишком большой. Максимум ${formatBytes(MAX_ATTACHMENT_BYTES)}.`
        )
      );
      return;
    }
    const resolved = resolveFileKind(file);
    if (resolved.kind === "unsupported") {
      setUploadError(
        t(
          locale,
          "Unsupported format. Use PNG/JPG/WebP/GIF, PDF, or text files.",
          "Неподдерживаемый формат. Разрешены PNG/JPG/WebP/GIF, PDF или текстовые файлы."
        )
      );
      return;
    }
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    const previewUrl = resolved.kind === "image" ? URL.createObjectURL(file) : undefined;
    setPendingAttachment({
      id: crypto.randomUUID(),
      file,
      name: file.name || "file",
      type: resolved.mime || file.type || "application/octet-stream",
      size: file.size,
      kind: resolved.kind,
      previewUrl,
    });
    setUploadError(null);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (disabled || loading || uploadingAttachments) return;
    if (files.length > 1) {
      setUploadError(t(locale, "Please attach one file at a time.", "Можно прикрепить только один файл за раз."));
      return;
    }
    setPendingFromFile(files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled || loading || uploadingAttachments) return;
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled || loading || uploadingAttachments) return;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setUploadError(t(locale, "Please attach one file at a time.", "Можно прикрепить только один файл за раз."));
      return;
    }
    setPendingFromFile(files[0]);
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !pendingAttachment) || loading || disabled || uploadingAttachments) return;
    const session = activeSession;
    if (!session) return;
    const sessionId = session.id;
    const pending = pendingAttachment;
    const messageText = text.trim().length > 0 ? text : t(locale, "Attached file", "Прикреплённый файл");
    const userMessageId = crypto.randomUUID();
    const attachmentPreview = pending
      ? ({
          id: pending.id,
          name: pending.name,
          type: pending.type,
          size: pending.size,
          url: pending.previewUrl ?? "",
          storageKey: `pending/${pending.id}`,
          previewUrl: pending.previewUrl,
          status: "pending",
        } as Attachment)
      : undefined;
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      text: messageText,
      attachments: attachmentPreview ? [attachmentPreview] : undefined,
    };
    const titleSeed = text.trim().length > 0 ? text : pending?.name || messageText;
    const titleFromInput = titleSeed.trim().slice(0, 42) + (titleSeed.trim().length > 42 ? "…" : "");

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              title: s.title === defaultTitle ? titleFromInput || s.title : s.title,
              messages: [...s.messages, userMessage],
            }
          : s
      )
    );
    setInput("");
    setUploadError(null);
    setLoading(true);
    if (pending) setUploadingAttachments(true);
    try {
      const paymentMessage = tKey(locale, "aiDisabledNoSubscription");
      const formData = new FormData();
      const payloadMessages = [...session.messages, userMessage].map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));
      formData.append("message", messageText);
      formData.append("messages", JSON.stringify(payloadMessages));
      formData.append("locale", locale);
      formData.append("contextType", contextType);
      formData.append("contextData", JSON.stringify(contextData ?? {}));
      if (pending) {
        formData.append("attachment", pending.file);
      }
      const res = await fetch("/app/api/ai/chat", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as
        | { text?: string; disabled?: boolean; error?: string; errorCode?: string; attachments?: Attachment[] }
        | null;
      if (!res.ok) {
        if (res.status === 402) {
          setDisabled(true);
          setDisabledReason(paymentMessage);
          throw new Error(paymentMessage);
        }
        if (res.status === 403) setDisabled(true);
        const mapError = (code?: string, fallback?: string) => {
          if (code === "file_too_large") {
            return t(
              locale,
              `File is too large. Max size is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
              `Файл слишком большой. Максимум ${formatBytes(MAX_ATTACHMENT_BYTES)}.`
            );
          }
          if (code === "unsupported_type") {
            return t(
              locale,
              "Unsupported format. Use PNG/JPG/WebP/GIF, PDF, or text files.",
              "Неподдерживаемый формат. Разрешены PNG/JPG/WebP/GIF, PDF или текстовые файлы."
            );
          }
          if (code === "openai_upload_failed") {
            return t(
              locale,
              "Could not process the document with OpenAI. Please try again.",
              "Не удалось обработать документ в OpenAI. Попробуйте ещё раз."
            );
          }
          if (code === "openai_failed") {
            return (
              fallback ||
              t(
                locale,
                "OpenAI request failed. Check your API key and model access.",
                "Ошибка OpenAI. Проверьте ключ API и доступ к модели."
              )
            );
          }
          if (code === "openai_missing_key") {
            return (
              fallback ||
              t(
                locale,
                "OpenAI is not configured. Add OPENAI_API_KEY in the server env.",
                "OpenAI не настроен. Добавьте OPENAI_API_KEY в серверные переменные."
              )
            );
          }
          if (code === "multiple_attachments") {
            return t(locale, "Please attach one file at a time.", "Можно прикрепить только один файл за раз.");
          }
          if (code === "empty_attachment") {
            return t(locale, "File is empty.", "Файл пустой.");
          }
          return fallback || t(locale, "Request failed.", "Ошибка запроса.");
        };
        if (pending || data?.errorCode) {
          setUploadError(mapError(data?.errorCode, data?.error));
        }
        const reason = data?.error;
        throw new Error(reason || "Request failed");
      }
      if (data?.disabled) setDisabled(true);

      const responseAttachments = data?.attachments?.length ? data.attachments : undefined;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages.map((m) =>
                    m.id === userMessageId ? { ...m, attachments: responseAttachments } : m
                  ),
                  { id: crypto.randomUUID(), role: "ai", text: data?.text ?? "" },
                ],
              }
            : s
        )
      );
      if (pending?.previewUrl) {
        URL.revokeObjectURL(pending.previewUrl);
      }
      if (pending) {
        setPendingAttachment(null);
      }
    } catch (e: any) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages.map((m) => (m.id === userMessageId ? { ...m, attachments: undefined } : m)),
                  {
                    id: crypto.randomUUID(),
                    role: "ai",
                    text:
                      locale === "ru"
                        ? `Сейчас не могу ответить. ${e?.message ?? ""}`
                        : `Sorry, I couldn't reply right now. ${e?.message ?? ""}`,
                  },
                ],
              }
            : s
        )
      );
    } finally {
      setLoading(false);
      setUploadingAttachments(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const removePendingAttachment = () => {
    clearPendingAttachment();
    setUploadError(null);
  };

  const startNewChat = () => {
    const welcome = buildWelcomeMessage();
    const sessionId = crypto.randomUUID();
    setSessions((prev) => [{ id: sessionId, title: defaultTitle, messages: [welcome] }, ...prev]);
    setActiveSessionId(sessionId);
    setInput("");
    clearPendingAttachment();
    setUploadError(null);
  };

  const deleteSession = (id: string) => {
    let nextActive: string | null = activeSessionId;
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        nextActive = filtered[0]?.id ?? null;
      }
      if (filtered.length === 0) {
        const welcome = buildWelcomeMessage();
        const newId = crypto.randomUUID();
        nextActive = newId;
        return [{ id: newId, title: defaultTitle, messages: [welcome] }];
      }
      return filtered;
    });
    setActiveSessionId(nextActive);
    setInput("");
    clearPendingAttachment();
    setUploadError(null);
  };

  if (!open) return null;

  const prompts = quickPrompts[roleKey];
  const widthClass = showSidebar ? "md:max-w-[960px]" : "md:max-w-[720px]";

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-slate-900/15" onClick={onClose} />
      <section
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-[95] flex h-[88vh] max-h-[100vh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl transition-all",
          "sm:bottom-0 sm:left-auto sm:right-0 sm:h-[90vh] sm:w-[82vw] sm:max-w-[82vw]",
          widthClass
        )}
      >
        <div className="flex h-full flex-1 overflow-hidden">
          <aside className={clsx("hidden w-60 shrink-0 flex-col border-r border-slate-100 bg-slate-50/60 sm:flex", showSidebar ? "sm:flex" : "sm:hidden")}>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">{t(locale, "Chats", "Чаты")}</p>
              <button
                type="button"
                onClick={startNewChat}
                className="flex h-8 w-8 items-center justify-center bg-white text-lg font-semibold text-primary ring-1 ring-slate-200 hover:bg-primary/10"
                aria-label={t(locale, "New chat", "Новый чат")}
              >
                +
              </button>
            </div>
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={startNewChat}
                className="w-full bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                {t(locale, "New chat", "Новый чат")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {sessions.map((s) => {
                const preview = s.messages.find((m) => m.role === "user")?.text || s.messages[0]?.text || defaultTitle;
                return (
                  <div
                    key={s.id}
                    className={clsx(
                      "mb-2 w-full rounded-2xl px-3 py-3 text-left transition",
                      s.id === activeSessionId
                        ? "bg-white shadow-sm ring-1 ring-slate-200"
                        : "bg-slate-100/70 text-slate-700 hover:bg-white hover:shadow-sm"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionId(s.id);
                        setInput("");
                      }}
                      className="flex w-full flex-col items-start text-left"
                    >
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">{s.title || defaultTitle}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">{preview}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className="mt-2 text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      {t(locale, "Delete", "Удалить")}
                    </button>
                  </div>
                );
              })}
              {sessions.length === 0 && <p className="text-xs text-slate-500">{t(locale, "No chats yet", "Пока нет чатов")}</p>}
            </div>
          </aside>

          <div className="flex flex-1 flex-col min-h-0">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <img
                  src="/branding/quadrantlogo.PNG"
                  alt="StressSense"
                  className="h-12 w-auto"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">StressSense AI</p>
                    <span className="bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-100">
                      beta
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t(
                      locale,
                      "Tips about work stress and teams at risk. Only about work, not medical advice.",
                      "Подсказки про рабочий стресс и команды в риске. Только про работу, не мед. советы."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSidebar((v) => !v)}
                  className="border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  aria-label={t(locale, "Toggle sidebar", "Скрыть/показать список чатов")}
                >
                  {showSidebar ? "⇤" : "☰"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="flex h-full flex-1 flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2 sm:hidden">
                <div className="text-sm font-semibold text-slate-900 line-clamp-1">{activeSession?.title || defaultTitle}</div>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  {t(locale, "New", "Новый")}
                </button>
              </div>
              <div ref={scrollRef} className="flex-1 min-h-0 space-y-3 overflow-y-auto px-5 py-4">
                {activeMessages.map((msg) => (
                  <div key={msg.id} className={clsx("flex", msg.role === "ai" ? "justify-start" : "justify-end")}>
                    <div
                      className={clsx(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1",
                        msg.role === "ai"
                          ? "bg-white text-slate-800 ring-slate-200"
                          : "bg-primary text-white ring-primary/30"
                      )}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((att) => {
                            const attachmentUrl = att.previewUrl || att.url;
                            const isImage = att.type.startsWith("image/");
                            const containerClass = clsx(
                              "flex items-center gap-2 rounded-xl border px-2 py-1 text-xs",
                              msg.role === "ai"
                                ? "border-slate-200 bg-slate-50 text-slate-700"
                                : "border-white/30 bg-white/10 text-white"
                            );
                            const content = (
                              <>
                                {isImage && attachmentUrl ? (
                                  <img src={attachmentUrl} alt={att.name} className="h-12 w-12 rounded-lg object-cover" />
                                ) : (
                                  <span className="text-sm">📎</span>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate">{att.name}</p>
                                  <p className={clsx("text-[10px]", msg.role === "ai" ? "text-slate-500" : "text-white/70")}>
                                    {formatBytes(att.size)}
                                  </p>
                                </div>
                              </>
                            );
                            return attachmentUrl ? (
                              <a
                                key={att.id}
                                href={attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={containerClass}
                              >
                                {content}
                              </a>
                            ) : (
                              <div key={att.id} className={containerClass}>
                                {content}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {msg.suggested && msg.suggested.length > 0 && (
                        <div className="mt-2 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {t(locale, "Suggested actions", "Рекомендуемые действия")}
                          </p>
                          <ol className="list-decimal space-y-1 pl-4">
                            {msg.suggested.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ol>
                          <p className="text-[11px] text-slate-500">
                            {t(
                              locale,
                              "AI tips are about work setup only, not medical advice.",
                              "AI-подсказки — только про организацию работы, не мед. рекомендации."
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600 shadow-inner ring-1 ring-slate-200">
                      {t(locale, "AI is thinking…", "AI думает…")}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={clsx(
                  "relative border-t border-slate-100 bg-white px-5 py-3 space-y-2 transition",
                  dragActive && "ring-2 ring-primary/30"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {dragActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/5 text-xs font-semibold text-primary">
                    {t(locale, "Drop file to attach", "Отпустите файл, чтобы прикрепить")}
                  </div>
                )}
                {prompts && (
                  <div className="flex flex-wrap gap-2">
                    {prompts.map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() => {
                          setInput(locale === "ru" ? p.ru : p.en);
                          void sendMessage(locale === "ru" ? p.ru : p.en);
                        }}
                        className="bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                      >
                        {locale === "ru" ? p.ru : p.en}
                      </button>
                    ))}
                  </div>
                )}
                {pendingAttachment && (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {pendingAttachment.kind === "image" && pendingAttachment.previewUrl ? (
                      <img
                        src={pendingAttachment.previewUrl}
                        alt={pendingAttachment.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="text-sm">📎</span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{pendingAttachment.name}</p>
                      <p className="text-[11px] text-slate-500">{formatBytes(pendingAttachment.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removePendingAttachment}
                      disabled={uploadingAttachments || loading}
                      className={clsx(
                        "ml-auto text-slate-500 hover:text-slate-700",
                        (uploadingAttachments || loading) && "cursor-not-allowed opacity-50"
                      )}
                      aria-label={t(locale, "Remove file", "Удалить файл")}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {uploadingAttachments && (
                  <p className="text-[11px] text-slate-500">
                    {t(locale, "Uploading attachment…", "Загружаем файл…")}
                  </p>
                )}
                {uploadError && <p className="text-[11px] text-rose-600">{uploadError}</p>}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,text/xml"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || loading || uploadingAttachments}
                    className="h-11 w-11 border border-slate-200 text-lg text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    aria-label={t(locale, "Attach file", "Прикрепить файл")}
                  >
                    📎
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="h-11 flex-1 border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder={placeholder}
                    disabled={disabled}
                  />
                  <button
                    type="submit"
                    disabled={disabled || loading || uploadingAttachments}
                    className="h-11 bg-gradient-to-r from-primary to-indigo-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
                  >
                    {t(locale, "Send", "Отправить")}
                  </button>
                </form>
                {disabled && (
                  <p className="text-[11px] text-amber-600">
                    {disabledReason ?? t(locale, "AI is currently unavailable.", "ИИ сейчас недоступен.")}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  {t(
                    locale,
                    "AI is experimental. Don’t share personal medical data. Responses are about work, not medical advice.",
                    "AI — экспериментальный. Не делитесь медицинскими данными. Подсказки только про работу, не мед. советы."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
