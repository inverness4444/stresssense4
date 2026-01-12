import Link from "next/link";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getLocale } from "@/lib/i18n-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  const locale = await getLocale();
  const isRu = locale === "ru";

  const nav = [
    { href: "/admin/users", label: isRu ? "Пользователи" : "Users" },
    { href: "/admin/topups", label: isRu ? "Заявки на пополнение" : "Top-up requests" },
    { href: "/admin/transactions", label: isRu ? "Транзакции" : "Transactions" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">StressSense</p>
            <h1 className="text-xl font-semibold text-slate-900">{isRu ? "Супер-админ" : "Super admin"}</h1>
          </div>
          <Link
            href="/app/overview"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isRu ? "Вернуться в приложение" : "Back to app"}
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <aside className="w-56 space-y-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
