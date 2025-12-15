"use client";

import { useMemo, useState, useTransition } from "react";
import type { User } from "@prisma/client";
import clsx from "clsx";
import { createTeam } from "@/app/app/teams/actions";
import { useRouter } from "next/navigation";

type Props = {
  users: Pick<User, "id" | "name" | "email" | "role">[];
};

export function CreateTeamModal({ users }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const reset = () => {
    setName("");
    setDescription("");
    setMemberIds([]);
    setMessage(null);
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createTeam({
        name,
        description,
        memberIds,
      });
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-gradient-to-r from-primary to-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
      >
        Create team
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Create team</h3>
                <p className="text-sm text-slate-600">
                  Group people so stress insights stay relevant and actionable.
                </p>
              </div>
              <button
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                className="text-slate-500 transition hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-800">Team name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Product Growth"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-800">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  rows={2}
                  placeholder="Optional summary of what this team does"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Members</p>
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  {sortedUsers.length === 0 && (
                    <p className="text-xs text-slate-500">No people yet.</p>
                  )}
                  {sortedUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                    >
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase text-slate-700">
                          {user.role}
                        </span>
                        <input
                          type="checkbox"
                          checked={memberIds.includes(user.id)}
                          onChange={() => toggleMember(user.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/40"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {message && <p className="mt-3 text-sm text-rose-600">{message}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={pending}
                onClick={handleSubmit}
                className={clsx(
                  "rounded-xl bg-gradient-to-r from-primary to-primary-strong px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg",
                  pending && "opacity-70"
                )}
              >
                {pending ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
