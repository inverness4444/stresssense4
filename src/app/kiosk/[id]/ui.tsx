"use client";

import { useEffect, useState } from "react";

type Question = { id: string; text: string; type: string; scaleMin: number | null; scaleMax: number | null };
type Props = { session: { id: string; name: string | null }; survey: { id: string; name: string; questions: Question[] } };

export default function KioskClient({ session, survey }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("kiosk_queue");
    if (stored) setPending(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("kiosk_queue", JSON.stringify(pending));
  }, [pending]);

  useEffect(() => {
    async function sync() {
      if (!navigator.onLine || !pending.length) return;
      const item = pending[0];
      try {
        await fetch(`/api/kiosk/${session.id}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        setPending((p) => p.slice(1));
        setMessage("Pending response synced.");
      } catch {
        /* ignore */
      }
    }
    sync();
  }, [pending, session.id]);

  const onSubmit = async (form: FormData) => {
    const answers = survey.questions.map((q) => ({
      questionId: q.id,
      type: q.type,
      scaleValue: q.type === "SCALE" ? Number(form.get(q.id)) || null : null,
      textValue: q.type === "TEXT" ? (form.get(q.id) as string) ?? null : null,
    }));
    const payload = { answers };
    if (!navigator.onLine) {
      setPending((p) => [...p, payload]);
      setMessage("Saved offline. Will sync when online.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await fetch(`/api/kiosk/${session.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage("Thank you! Ready for the next person.");
    } catch {
      setMessage("Could not submit. Saved offline.");
      setPending((p) => [...p, payload]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">StressSense</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{survey.name}</h1>
          <p className="text-sm text-slate-600">Anonymous kiosk mode · Ready for the next teammate</p>
        </div>
        <form
          className="mt-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(new FormData(e.currentTarget));
          }}
        >
          {survey.questions.map((q) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{q.text}</p>
              {q.type === "SCALE" ? (
                <div className="mt-3 flex gap-2">
                  {Array.from({ length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 }).map((_, idx) => {
                    const val = (q.scaleMin ?? 1) + idx;
                    return (
                      <label key={val} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
                        <input type="radio" name={q.id} value={val} className="hidden" required />
                        {val}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  name={q.id}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Optional comment"
                  rows={3}
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-4 py-3 text-center text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.01]"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit response"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          After submitting, the screen is ready for the next person. Offline? Responses will sync automatically.
        </p>
        {message && <p className="mt-2 text-center text-sm text-emerald-700">{message}</p>}
      </div>
    </div>
  );
}
