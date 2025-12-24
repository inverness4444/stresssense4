"use client";

import { useState } from "react";
import { regenerateInviteToken } from "./actions";

const ROLE_OPTIONS = [
  { value: "employee", label: "Сотрудник" },
  { value: "manager", label: "Менеджер" },
  { value: "admin", label: "Админ" },
] as const;

export function InviteLinkBlock({
  slug,
  inviteToken,
  baseUrl,
  canRegenerate,
}: {
  slug: string;
  inviteToken: string;
  baseUrl: string;
  canRegenerate: boolean;
}) {
  const safeSlug = slug === "-" || !slug?.trim() ? inviteToken.slice(0, 8) : slug;
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "admin">("employee");
  const inviteUrl = `${baseUrl}/join/${safeSlug}/${role}/${inviteToken}`;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Invite teammates</h3>
      <p className="text-sm text-slate-600">Share this link so employees join your company instead of creating a new workspace.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
          Роль приглашённого пользователя
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <code className="flex-1 break-all rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200">
          {inviteUrl}
        </code>
        {canRegenerate && (
          <form
            action={async () => {
              await regenerateInviteToken();
              setMessage("Link reset. Refresh to see the new token.");
            }}
          >
            <button
              type="submit"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
            >
              Reset link
            </button>
          </form>
        )}
        <button
          type="button"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          onClick={async () => {
            await navigator.clipboard.writeText(inviteUrl);
            setMessage("Copied!");
          }}
        >
          Copy link
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </section>
  );
}
