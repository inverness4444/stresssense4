import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n-server";
import { BASE_CURRENCY } from "@/config/payments";
import { getRoleLabel } from "@/lib/roles";

function formatCurrency(value: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

type SearchParams = { q?: string; role?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const query = (searchParams?.q ?? "").trim();
  const role = (searchParams?.role ?? "").trim().toUpperCase();

  const where: any = {};
  if (query) {
    where.OR = [
      { email: { contains: query, mode: "insensitive" } },
      { id: { contains: query } },
    ];
  }
  if (role) {
    where.role = role;
  }
  where.NOT = { role: "SUPER_ADMIN" };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const balanceLocale = isRu ? "ru-RU" : "en-US";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{isRu ? "Пользователи" : "Users"}</h2>
        <p className="text-sm text-slate-600">
          {isRu ? "Поиск и управление ролями." : "Search and manage user roles."}
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={query}
          placeholder={isRu ? "Email или ID" : "Email or ID"}
          className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue={role}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">{isRu ? "Все роли" : "All roles"}</option>
          <option value="ADMIN">{getRoleLabel("ADMIN", locale)}</option>
          <option value="HR">{getRoleLabel("HR", locale)}</option>
          <option value="MANAGER">{getRoleLabel("MANAGER", locale)}</option>
          <option value="EMPLOYEE">{getRoleLabel("EMPLOYEE", locale)}</option>
        </select>
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          {isRu ? "Применить" : "Apply"}
        </button>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.8fr] gap-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span>Email</span>
          <span>Name</span>
          <span>Role</span>
          <span>{isRu ? "Баланс" : "Balance"}</span>
          <span>{isRu ? "Создан" : "Created"}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((user: any) => (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr_0.8fr] gap-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-900">{user.email}</span>
              <span>{user.name}</span>
              <span>{getRoleLabel(user.role, locale)}</span>
              <span>{formatCurrency(Number(user.balance ?? 0), BASE_CURRENCY, balanceLocale)}</span>
              <span className="text-xs text-slate-500">
                {new Date(user.createdAt).toLocaleDateString(balanceLocale)}
              </span>
            </Link>
          ))}
          {users.length === 0 && (
            <p className="py-6 text-sm text-slate-500">{isRu ? "Пользователей не найдено." : "No users found."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
