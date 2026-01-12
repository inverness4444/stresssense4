"use client";

import { useEffect, useState } from "react";
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

export function JoinWorkspaceClient({ workspaceName, workspaceSlug, inviteToken, role, isAuthenticated }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    signOut({ redirect: false }).catch(() => {});
    setName("");
    setEmail("");
    setPassword("");
  }, [isAuthenticated]);

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
        const code = data?.error;
        const message =
          code === "weak_password"
            ? "Пароль должен быть не короче 8 символов."
            : code === "account_in_other_org"
              ? "Этот аккаунт уже привязан к другой компании."
              : code === "seat_limit"
                ? "Недостаточно мест. Попросите администратора увеличить количество мест."
              : code === "invalid_link"
                ? "Ссылка недействительна или устарела."
                : "Не удалось присоединиться к компании.";
        setError(message);
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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">StressSense</p>
        <h1 className="text-2xl font-semibold text-slate-900">Вы были приглашены в компанию</h1>
        <p className="text-sm text-slate-600">
          {workspaceName}. Роль: {roleLabels[role]}.
        </p>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">{error}</p>}

      <form className="space-y-4" onSubmit={handleSignup}>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-800">Имя</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
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
            autoComplete="off"
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
            autoComplete="new-password"
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
    </div>
  );
}
