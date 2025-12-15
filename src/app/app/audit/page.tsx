import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Access restricted.</p>
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Аудит действий</h2>
          <p className="text-sm text-slate-600">Последние события в рабочем пространстве.</p>
        </div>
        <Link href="/app/overview" className="text-sm font-semibold text-primary hover:underline">
          Назад к обзору
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Дата", "Пользователь", "Действие", "Цель", "Детали"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-700">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-800">{log.user?.name ?? "System"}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{log.action}</td>
                <td className="px-4 py-3 text-slate-700">
                  {log.targetType}
                  {log.targetId ? ` (${log.targetId})` : ""}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-600">
                  Нет записей аудита.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
