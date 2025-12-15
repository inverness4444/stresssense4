"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import clsx from "clsx";
import { t, type Locale } from "@/lib/i18n";

export function SignInForm({ locale = "en" }: { locale?: Locale }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/app/overview",
      });
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      router.push(result?.url ?? "/app/overview");
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">{t(locale, "signinTitle")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t(locale, "signinSubtitle")}</p>
      <form
        id="signin-form"
        action={() => {}}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 space-y-4"
      >
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-800">Email</span>
          <input
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="admin@stresssense.demo"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-800">{t(locale, "signinPassword")}</span>
          <input
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="••••••••"
          />
        </label>
        {message && <p className="text-sm text-rose-600">{message}</p>}
        <button
          type="submit"
          disabled={pending}
          className={clsx(
            "w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg",
            pending && "opacity-70"
          )}
        >
          {pending ? (locale === "ru" ? "Входим..." : "Signing in...") : t(locale, "signinButton")}
        </button>
        <p className="text-xs text-slate-500">
          {locale === "ru" ? "Демо-аккаунт после сидинга:" : "Demo credentials after seeding:"} <strong>admin@stresssense.demo / admin1234</strong>
        </p>
      </form>
    </div>
  );
}
