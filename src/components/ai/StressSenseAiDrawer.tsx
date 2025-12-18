"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Locale } from "@/lib/i18n";
import type { AiContextData, AiContextType } from "@/lib/ai/mockAiClient";
import { mockAiRespond } from "@/lib/ai/mockAiClient";

type Message = { id: string; role: "ai" | "user"; text: string; suggested?: string[] };
type ChatSession = { id: string; title: string; messages: Message[] };

type DrawerProps = {
  open: boolean;
  locale: Locale;
  contextType: AiContextType;
  contextData?: AiContextData;
  onClose: () => void;
};

function t(locale: Locale, en: string, ru: string) {
  return locale === "ru" ? ru : en;
}

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

export function StressSenseAiDrawer({ open, locale, contextType, contextData, onClose }: DrawerProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    if (open) {
      const welcome = buildWelcomeMessage();
      const sessionId = crypto.randomUUID();
      const defaultTitle = locale === "ru" ? "Новый чат" : "New chat";
      setSessions([{ id: sessionId, title: defaultTitle, messages: [welcome] }]);
      setActiveSessionId(sessionId);
      setShowSidebar(true);
      setInput("");
    } else {
      setSessions([]);
      setActiveSessionId(null);
      setShowSidebar(true);
      setInput("");
    }
  }, [contextType, locale, open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeMessages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const session = activeSession;
    if (!session) return;
    const sessionId = session.id;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text };
    const titleFromInput = text.trim().slice(0, 42) + (text.trim().length > 42 ? "…" : "");

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
    const ai = await mockAiRespond(text, contextType, { ...contextData, locale });
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, { id: crypto.randomUUID(), role: "ai", text: ai.text, suggested: ai.suggested }] } : s
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const startNewChat = () => {
    const welcome = buildWelcomeMessage();
    const sessionId = crypto.randomUUID();
    setSessions((prev) => [{ id: sessionId, title: defaultTitle, messages: [welcome] }, ...prev]);
    setActiveSessionId(sessionId);
    setInput("");
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-primary ring-1 ring-slate-200 hover:bg-primary/10"
                aria-label={t(locale, "New chat", "Новый чат")}
              >
                +
              </button>
            </div>
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={startNewChat}
                className="w-full rounded-full bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-sm"
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
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white shadow-sm">
                  💜
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">StressSense AI</p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-100">
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
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  aria-label={t(locale, "Toggle sidebar", "Скрыть/показать список чатов")}
                >
                  {showSidebar ? "⇤" : "☰"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
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
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
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
              </div>

              <div className="border-t border-slate-100 bg-white px-5 py-3 space-y-2">
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
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                      >
                        {locale === "ru" ? p.ru : p.en}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="h-11 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder={placeholder}
                  />
                  <button
                    type="submit"
                    className="h-11 rounded-full bg-gradient-to-r from-primary to-indigo-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                  >
                    {t(locale, "Send", "Отправить")}
                  </button>
                </form>
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
