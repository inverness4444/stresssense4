import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/internalAuth";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const user = await getInternalUser();
  if (!user) redirect("/internal/auth/signin");
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">StressSense Internal</p>
          <p className="text-sm font-semibold text-slate-900">{user?.name ?? user?.email}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <a href="/internal/analytics" className="rounded-full px-3 py-2 hover:bg-slate-100">
            Analytics
          </a>
          <a href="/internal/organizations" className="rounded-full px-3 py-2 hover:bg-slate-100">
            Organizations
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
