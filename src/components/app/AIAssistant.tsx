"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask about stress insights, risk teams, or talking points for managers." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading || disabled) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/app/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = (await res.json().catch(() => null)) as { text?: string; disabled?: boolean; error?: string } | null;
      if (!res.ok) {
        if ([402, 403, 503].includes(res.status)) setDisabled(true);
        const reason = res.status === 402 ? "AI will be available after payment." : data?.error;
        throw new Error(reason || "Request failed");
      }
      if (data?.disabled) setDisabled(true);
      setMessages((prev) => [...prev, { role: "assistant", content: data?.text ?? "" }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I couldn't reply right now. ${e?.message ?? ""}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-gradient-to-r from-primary to-primary-strong px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition hover:scale-[1.02]"
      >
        Ask StressSense AI
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/10">
          <div className="m-2 flex h-[88vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">StressSense AI (beta)</p>
                <p className="text-sm text-slate-600">
                  Ask about stress results and teams. AI sees only aggregated data, not individuals.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-white shadow-sm"
                      : "bg-slate-100 text-slate-800 shadow-inner"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && <p className="text-xs text-slate-500">AI is thinking…</p>}
              {disabled && <p className="text-xs text-amber-600">AI assistant is currently unavailable.</p>}
              <div ref={endRef} />
            </div>
            <div className="border-t border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <textarea
                  className="h-14 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={disabled ? "AI assistant unavailable" : "Ask about stress trends, at-risk teams, talking points..."}
                  value={input}
                  disabled={disabled}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  onClick={send}
                  disabled={loading || disabled}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                AI is experimental. Don&apos;t share personal data. Responses are aggregated, not individual advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
