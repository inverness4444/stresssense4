"use client";

import React from "react";

export function SSOButton() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/auth/sso/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "SSO not available");
      window.location.href = `/auth/sso/redirect?orgId=${data.orgId}`;
    } catch (e: any) {
      setError(e?.message ?? "SSO failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Sign in with company SSO</p>
      <div className="mt-2 space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.name@company.com"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          {loading ? "Redirecting..." : "Sign in with company SSO"}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
