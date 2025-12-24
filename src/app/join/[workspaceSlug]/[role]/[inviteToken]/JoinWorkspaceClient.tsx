"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = {
  workspaceName: string;
  workspaceSlug: string;
  inviteToken: string;
  role: "employee" | "manager" | "admin";
  isAuthenticated: boolean;
  userEmail?: string | null;
  isOwner?: boolean;
};

const roleLabels: Record<Props["role"], string> = {
  employee: "сотрудник",
  manager: "менеджер",
  admin: "админ",
};

export function JoinWorkspaceClient({ workspaceName, workspaceSlug, inviteToken, role, isAuthenticated, userEmail, isOwner }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">(isAuthenticated ? "login" : "signup");

  const callJoin = async (payload: Record<string, string>) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: workspaceSlug, inviteToken, role, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to join workspace");
        setPending(false);
        return null;
      }
      return data as { redirect?: string; owner?: boolean };
    } catch (e) {
      console.error(e);
      setError("Failed to join workspace");
      setPending(false);
      return null;
    }
  };

  const handleExistingSession = async () => {
    const data = await callJoin({});
    if (data?.redirect) {
      router.replace(data.redirect);
    }
    setPending(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("Все поля обязательны");
      return;
    }
    const data = await callJoin({ name, email, password });
    if (data) {
      await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: data.redirect || "/app/my/home",
      });
    }
    setPending(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email и пароль обязательны");
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(result.error);
      return;
    }
    const data = await callJoin({});
    if (data?.redirect) {
      router.replace(data.redirect);
    }
    setPending(false);
  };

  if (isOwner) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900">Это ваша ссылка приглашения</h1>
        <p className="text-sm text-slate-600">
          Отправьте её коллегам, чтобы они присоединились как {roleLabels[role]}. Вы уже являетесь участником {workspaceName}.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
            onClick={() => router.replace("/app/overview")}
          >
            Перейти в кабинет
          </button>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
            onClick={() => signOut({ callbackUrl: typeof window !== "undefined" ? window.location.href : "/" })}
          >
            Выйти и пригласить себя как новый аккаунт
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
        <h1 className="text-2xl font-semibold text-slate-900">Присоединение к компании</h1>
        <p className="text-sm text-slate-600">
          Вы присоединяетесь к компании {workspaceName} как {roleLabels[role]}.
        </p>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">{error}</p>}

      {!isAuthenticated ? (
        <>
          <div className="flex justify-center gap-3 text-sm font-semibold">
            <button
              className={mode === "signup" ? "text-primary underline" : "text-slate-600 hover:text-primary"}
              onClick={() => setMode("signup")}
              type="button"
            >
              Создать аккаунт
            </button>
            <button
              className={mode === "login" ? "text-primary underline" : "text-slate-600 hover:text-primary"}
              onClick={() => setMode("login")}
              type="button"
            >
              У меня уже есть аккаунт
            </button>
          </div>
          {mode === "signup" ? (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Имя</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Пароль</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
              >
                {pending ? "Создаём аккаунт..." : "Создать аккаунт и присоединиться"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">Пароль</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
              >
                {pending ? "Проверяем..." : "Войти и присоединиться"}
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Вы вошли как <span className="font-semibold text-slate-900">{userEmail || "текущий пользователь"}</span>. Выберите действие.
          </div>
          <button
            onClick={handleExistingSession}
            disabled={pending}
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
          >
            {pending ? "Присоединяем..." : "Присоединиться как текущий пользователь"}
          </button>
          <button
            type="button"
            onClick={async () => {
              const url = typeof window !== "undefined" ? window.location.href : "/join";
              await signOut({ redirect: true, callbackUrl: url });
            }}
            className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40 hover:text-primary"
          >
            Выйти и создать новый аккаунт
          </button>
        </div>
      )}
    </div>
  );
}
