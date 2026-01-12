"use client";

import { useEffect, useMemo, useState } from "react";
import { containsPii } from "@/lib/anonymousFeedback";
import { t, type Locale } from "@/lib/i18n";

type RecipientOption = {
  id: string;
  name: string;
  role?: string;
};

type TeamOption = {
  id: string;
  name: string;
  size: number;
  recipients: RecipientOption[];
};

type CategoryOption = {
  id: string;
  label: string;
};

type FeedbackStatus =
  | { tone: "success" | "info"; message: string; threadId?: string }
  | { tone: "error"; message: string };

type Props = {
  locale: Locale;
  teams: TeamOption[];
  admins: RecipientOption[];
  categories: CategoryOption[];
  minTeamSize: number;
};

export default function SendAnonymousFeedbackClient({
  locale,
  teams,
  admins,
  categories,
  minTeamSize,
}: Props) {
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? "");
  const [recipientId, setRecipientId] = useState<string>("");
  const [category, setCategory] = useState<string>(categories[0]?.id ?? "");
  const [tags, setTags] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedTeam = useMemo(() => teams.find((team) => team.id === teamId) ?? null, [teams, teamId]);
  const teamTooSmall = selectedTeam ? selectedTeam.size < minTeamSize : false;
  const teamRecipients = selectedTeam?.recipients ?? [];
  const useAdminFallback = !selectedTeam || teamRecipients.length === 0;
  const recipients = useAdminFallback ? admins : teamRecipients;
  const hasRecipients = recipients.length > 0;
  const piiDetected = message.length > 0 && containsPii(message);
  const trimmedMessage = message.trim();
  const messageTooShort = trimmedMessage.length < 10;
  const canSubmit =
    !isSubmitting &&
    !!recipientId &&
    !!category &&
    !piiDetected &&
    !messageTooShort &&
    hasRecipients;

  useEffect(() => {
    if (!recipients.length) {
      setRecipientId("");
      return;
    }
    if (!recipients.some((recipient) => recipient.id === recipientId)) {
      setRecipientId(recipients[0].id);
    }
  }, [recipients, recipientId]);

  const warningMessage = teamTooSmall
    ? t(locale, "feedbackTeamSmallWarning")
    : selectedTeam && teamRecipients.length === 0
      ? t(locale, "feedbackNoLeadersWarning")
      : null;

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !canSubmit) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/anonymous-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: selectedTeam?.id ?? null,
          recipient_leader_id: recipientId,
          category,
          tags,
          message: trimmedMessage,
          allow_followup: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = payload?.error;
        if (errorMessage === "PII detected") {
          setStatus({ tone: "error", message: t(locale, "feedbackPiiWarning") });
        } else if (errorMessage === "Rate limit exceeded") {
          setStatus({ tone: "error", message: t(locale, "feedbackRateLimit") });
        } else if (errorMessage === "No admin recipient available" || errorMessage === "Recipient not found") {
          setStatus({ tone: "error", message: t(locale, "feedbackNoRecipient") });
        } else if (errorMessage === "Leader not found in team") {
          setStatus({ tone: "error", message: t(locale, "feedbackNoLeadersWarning") });
        } else {
          setStatus({ tone: "error", message: t(locale, "feedbackError") });
        }
        return;
      }

      const successMessage = payload?.routedToAdmin
        ? t(locale, "feedbackRoutedToAdmin")
        : t(locale, "feedbackSuccess");
      setStatus({ tone: payload?.routedToAdmin ? "info" : "success", message: successMessage, threadId: payload?.threadId });
      setMessage("");
      setTags("");
    } catch (error) {
      setStatus({ tone: "error", message: t(locale, "feedbackError") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasTeams = teams.length > 0;

  return (
    <div className="space-y-6">
      {!hasTeams && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t(locale, "feedbackNoTeams")}
        </div>
      )}
      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            status.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : status.tone === "info"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{status.message}</span>
            {status.tone !== "error" && status.threadId && (
              <a
                href={`/app/feedback/thread/${status.threadId}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {t(locale, "feedbackViewThread")}
              </a>
            )}
          </div>
        </div>
      )}

      {warningMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {warningMessage}
        </div>
      )}

      {!hasRecipients && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {t(locale, "feedbackNoRecipient")}
        </div>
      )}

      {piiDetected && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {t(locale, "feedbackPiiWarning")}
        </div>
      )}

      <form onSubmit={submitFeedback} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>{t(locale, "feedbackTeamLabel")}</span>
            {hasTeams ? (
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                —
              </div>
            )}
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>{t(locale, "feedbackLeaderLabel")}</span>
            <select
              value={recipientId}
              onChange={(event) => setRecipientId(event.target.value)}
              disabled={!hasRecipients}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
            >
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>{t(locale, "feedbackCategoryLabel")}</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>{t(locale, "feedbackTagsLabel")}</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={t(locale, "feedbackTagsPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
          <span>{t(locale, "feedbackMessageLabel")}</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:bg-slate-200 disabled:text-slate-500"
        >
          {t(locale, "feedbackSubmit")}
        </button>
      </form>
    </div>
  );
}
