"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export type ThreadMessage = {
  id: string;
  direction: "sender_to_leader" | "leader_to_sender";
  body: string;
  createdAt: string;
};

export type ThreadPayload = {
  id: string;
  anonHandle: string;
  feedbackId: string;
  feedback: {
    id: string;
    category: string;
    status: string;
    allowFollowup: boolean;
    team: { id: string; name: string } | null;
    createdAt: string;
  };
  messages: ThreadMessage[];
};

type Props = {
  locale: Locale;
  thread: ThreadPayload;
  isLeader: boolean;
  isSender: boolean;
  canReply: boolean;
  canResolve: boolean;
  backHref: string;
};

export default function ThreadClient({
  locale,
  thread,
  isLeader,
  isSender,
  canReply,
  canResolve,
  backHref,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(thread.messages);
  const [status, setStatus] = useState<string>(thread.feedback.status);
  const [reply, setReply] = useState<string>("");
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categoryLabels: Record<string, string> = {
    communication: t(locale, "feedbackCategoryCommunication"),
    workload: t(locale, "feedbackCategoryWorkload"),
    process: t(locale, "feedbackCategoryProcess"),
    culture: t(locale, "feedbackCategoryCulture"),
    conflict: t(locale, "feedbackCategoryConflict"),
    ideas: t(locale, "feedbackCategoryIdeas"),
  };

  const statusLabels: Record<string, string> = {
    new: t(locale, "feedbackStatusNew"),
    in_progress: t(locale, "feedbackStatusInProgress"),
    resolved: t(locale, "feedbackStatusResolved"),
  };

  const statusStyles: Record<string, string> = {
    new: "bg-amber-50 text-amber-700 ring-amber-200",
    in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
    resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  const allowReply = canReply && status !== "resolved";
  const followupDisabled = !thread.feedback.allowFollowup;

  const formattedDate = new Date(thread.feedback.createdAt).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US"
  );

  const handleReply = async () => {
    if (!reply.trim() || isReplying || !allowReply) return;
    setIsReplying(true);
    setError(null);

    try {
      const response = await fetch(`/api/anonymous-threads/${thread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (payload?.error === "Follow-up disabled") {
          setError(t(locale, "feedbackThreadFollowupDisabled"));
        } else {
          setError(t(locale, "feedbackError"));
        }
        return;
      }
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          direction: "leader_to_sender",
          body: reply.trim(),
          createdAt: now,
        },
      ]);
      setStatus("in_progress");
      setReply("");
    } catch (err) {
      setError(t(locale, "feedbackError"));
    } finally {
      setIsReplying(false);
    }
  };

  const handleResolve = async () => {
    if (!canResolve || status === "resolved") return;
    setError(null);
    try {
      const response = await fetch(`/api/anonymous-feedback/${thread.feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (!response.ok) {
        setError(t(locale, "feedbackError"));
        return;
      }
      setStatus("resolved");
    } catch (err) {
      setError(t(locale, "feedbackError"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{t(locale, "feedbackThreadTitle")}</h2>
          <p className="text-sm text-slate-600">{thread.anonHandle}</p>
        </div>
        <a
          href={backHref}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        >
          {t(locale, "feedbackThreadBack")}
        </a>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {categoryLabels[thread.feedback.category] ?? thread.feedback.category}
            </p>
            <p className="text-xs text-slate-500">
              {thread.feedback.team?.name ?? "—"} · {formattedDate}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[status] ?? statusStyles.new}`}>
            {statusLabels[status] ?? status}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((msg) => {
          const isSenderMessage = msg.direction === "sender_to_leader";
          const alignRight = isSender ? isSenderMessage : isLeader ? !isSenderMessage : !isSenderMessage;
          const label = isSenderMessage
            ? isSender
              ? t(locale, "feedbackThreadYouLabel")
              : thread.anonHandle
            : isLeader
              ? t(locale, "feedbackThreadYouLabel")
              : t(locale, "feedbackThreadLeaderLabel");
          const dateLabel = new Date(msg.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US");
          return (
            <div key={msg.id} className={`flex ${alignRight ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xl rounded-2xl border px-4 py-3 shadow-sm ${alignRight ? "bg-primary/5 border-primary/20" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{label}</span>
                  <span>{dateLabel}</span>
                </div>
                <p className="mt-2 text-sm text-slate-800 whitespace-pre-line">{msg.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {allowReply ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">{t(locale, "feedbackThreadReplyButton")}</p>
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={4}
            placeholder={t(locale, "feedbackThreadReplyPlaceholder")}
            className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReply}
              disabled={!reply.trim() || isReplying}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
            >
              {t(locale, "feedbackThreadReplyButton")}
            </button>
            {canResolve && status !== "resolved" && (
              <button
                type="button"
                onClick={handleResolve}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t(locale, "feedbackThreadResolveButton")}
              </button>
            )}
          </div>
        </div>
      ) : followupDisabled ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t(locale, "feedbackThreadFollowupDisabled")}
        </div>
      ) : null}

      {canResolve && status !== "resolved" && !canReply && (
        <button
          type="button"
          onClick={handleResolve}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {t(locale, "feedbackThreadResolveButton")}
        </button>
      )}

    </div>
  );
}
