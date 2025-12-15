'use client';

import { useState, FormEvent } from "react";

export function NpsWidget({ surveyId }: { surveyId: string }) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (score == null) return;
    await fetch("/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({ eventName: "nps_submitted", source: "web_app", properties: { score, comment, surveyId } }),
    });
    setSubmitted(true);
  }

  if (submitted) return <p className="text-sm text-emerald-700">Thanks for your feedback!</p>;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">How likely are you to recommend StressSense?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setScore(i)}
            className={`h-9 w-9 rounded-full border text-sm font-semibold ${
              score === i ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
      <button disabled={score == null} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Submit
      </button>
    </form>
  );
}
