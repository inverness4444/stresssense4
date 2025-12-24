import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/app/AccessDenied";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAll, markOne } from "./actions";
import { ensureOrgSettings } from "@/lib/access";
import { isFeatureEnabled } from "@/lib/features";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (user.role === "EMPLOYEE") {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
        <AccessDenied />
      </div>
    );
  }

  const settings = await ensureOrgSettings(user.organizationId);
  if (!isFeatureEnabled("notifications", settings)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Уведомления выключены для этой организации.</p>
      </div>
    );
  }

  const notifications = (await prisma.notification.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [{ userId: null }, { userId: user.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-600">Updates across surveys and teams.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await markAll();
          }}
        >
          <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
            Mark all as read
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {notifications.map((n: any) => (
          <form
            key={n.id}
            action={async () => {
              "use server";
              await markOne(n.id);
            }}
            className={`flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${
              !n.isRead ? "ring-1 ring-primary/10" : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
              {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
              <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              {n.link && (
                <a
                  href={n.link}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Open
                </a>
              )}
              {!n.isRead && (
                <button className="text-xs font-semibold text-slate-600 hover:text-slate-900" type="submit">
                  Mark read
                </button>
              )}
            </div>
          </form>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-slate-600">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
