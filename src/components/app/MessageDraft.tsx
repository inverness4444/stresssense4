"use client";

import { useState } from "react";

export function MessageDraft({ teamId }: { teamId: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/app/api/ai/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to draft");
      setText(data.text ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Failed to draft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">AI draft</p>
          <h3 className="text-lg font-semibold text-slate-900">Message to your team</h3>
          <p className="text-sm text-slate-600">Draft a supportive note before you adapt and send.</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Drafting..." : "Draft with AI"}
        </button>
      </div>
      <textarea
        className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="AI-generated draft will appear here..."
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <p className="text-[11px] text-slate-500">Always review and adapt AI drafts before sending to your team.</p>
    </div>
  );
}
