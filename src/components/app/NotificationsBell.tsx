"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Notification } from "@prisma/client";
import { markAll, markOne } from "@/app/app/notifications/actions";

type Props = {
  notifications: Notification[];
  unreadCount: number;
};

export function NotificationsBell({ notifications, unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.isRead).length || unreadCount;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              className="text-xs font-semibold text-primary"
              disabled={pending || unread === 0}
              onClick={() =>
                startTransition(async () => {
                  await markAll();
                  setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
                })
              }
            >
              Mark all as read
            </button>
          </div>
          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {items.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border border-slate-200 px-3 py-2 ${n.isRead ? "bg-white" : "bg-slate-50 ring-1 ring-primary/10"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-600">{n.body}</p>}
                    <p className="text-[11px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    disabled={pending || n.isRead}
                    onClick={() =>
                      startTransition(async () => {
                        await markOne(n.id);
                        setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
                      })
                    }
                  >
                    Mark
                  </button>
                </div>
                {n.link && (
                  <Link
                    href={n.link}
                    className="mt-1 inline-flex text-xs font-semibold text-primary hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    Open
                  </Link>
                )}
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-slate-600">No notifications yet.</p>}
          </div>
          <Link
            href="/app/notifications"
            className="mt-2 block text-center text-xs font-semibold text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}
