"use client";

import { useState, useTransition } from "react";
import { createJoinInviteToken } from "./actions";

const ROLE_OPTIONS = [
  { value: "employee", label: "Сотрудник" },
  { value: "manager", label: "Менеджер" },
  { value: "admin", label: "Админ" },
] as const;

export function InviteLinkBlock({
  slug,
  organizationId,
  inviteToken,
  baseUrl,
  canRegenerate,
}: {
  slug: string;
  organizationId?: string;
  inviteToken: string;
  baseUrl: string;
  canRegenerate: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "admin">("employee");
  const [token, setToken] = useState(inviteToken);
  const [pending, startTransition] = useTransition();
  const normalizedSlug = slug?.trim() && slug !== "-" ? slug.trim() : "";
  const safeSlug = normalizedSlug || organizationId || token.slice(0, 8);
  const inviteUrl = `${baseUrl}/join/${safeSlug}/${role}/${token}`;

  const normalizeRole = (value: unknown): "employee" | "manager" | "admin" => {
    if (value === "employee" || value === "manager" || value === "admin") {
      return value;
    }
    return "employee";
  };

  const regenerate = (nextRole?: "employee" | "manager" | "admin") => {
    startTransition(async () => {
      const normalizedRole = normalizeRole(nextRole ?? role);
      const next = await createJoinInviteToken(normalizedRole);
      if (next) {
        setToken(next);
        setMessage("New link generated. It expires in 7 days and works once.");
      }
    });
  };
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Invite teammates</h3>
      <p className="text-sm text-slate-600">Share this link so employees join your company instead of creating a new workspace.</p>
      <p className="text-xs text-slate-500">Each link expires in 7 days and can be used only once.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
          Роль приглашённого пользователя
          <select
            value={role}
            onChange={(e) => {
              const nextRole = normalizeRole(e.target.value);
              setRole(nextRole);
              if (canRegenerate) {
                regenerate(nextRole);
              }
            }}
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
          <button
            type="button"
            disabled={pending}
            onClick={regenerate}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
          >
            Generate link
          </button>
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
