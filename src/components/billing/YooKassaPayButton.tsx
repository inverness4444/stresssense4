"use client";

import { useState } from "react";

type Props = {
  label: string;
  endpoint: string;
  payload: Record<string, unknown>;
  disabled?: boolean;
  className?: string;
};

export function YooKassaPayButton({ label, endpoint, payload, disabled, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Payment failed");
        return;
      }
      if (data?.confirmation_url) {
        window.location.href = data.confirmation_url;
        return;
      }
      setError("Missing confirmation URL");
    } catch (e) {
      setError("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className={className}
      >
        {loading ? "..." : label}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
