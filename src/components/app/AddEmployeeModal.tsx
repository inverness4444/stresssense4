"use client";

import { useMemo, useState, useTransition } from "react";
import type { Team } from "@prisma/client";
import { createEmployee } from "@/app/app/employees/actions";
import { USER_ROLES, type UserRole } from "@/lib/roles";
import clsx from "clsx";
import { useRouter } from "next/navigation";

type Props = {
  teams: Pick<Team, "id" | "name">[];
};

export function AddEmployeeModal({ teams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("EMPLOYEE");
  const [slackUserId, setSlackUserId] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [sendLater, setSendLater] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const reset = () => {
    setName("");
    setEmail("");
    setRole("EMPLOYEE");
    setSlackUserId("");
    setSelectedTeams([]);
    setSendLater(false);
    setMessage(null);
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createEmployee({
        name,
        email,
        role,
        teamIds: selectedTeams,
        slackUserId,
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
        Add employee
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Add employee</h3>
                <p className="text-sm text-slate-600">
                  Create a new teammate, set their role, and place them into the right teams.
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
                <span className="text-sm font-semibold text-slate-800">Full name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Jordan Lee"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-800">Slack user ID (опционально)</span>
                <input
                  value={slackUserId}
                  onChange={(e) => setSlackUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="U123ABC"
                />
                <p className="text-xs text-slate-500">Используется для отправки инвайтов в Slack.</p>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-800">Work email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="name@company.com"
                  type="email"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-800">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Teams</p>
                <div className="flex max-h-32 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  {sortedTeams.length === 0 && (
                    <p className="text-xs text-slate-500">No teams yet. Create one first.</p>
                  )}
                  {sortedTeams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(team.id)}
                        onChange={() => toggleTeam(team.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sendLater}
                  onChange={(e) => setSendLater(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                Send invite email later
              </label>
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
