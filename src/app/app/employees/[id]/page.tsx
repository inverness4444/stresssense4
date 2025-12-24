import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anonymize } from "./actions";

type Props = { params: { id: string } };

export default async function EmployeeDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  const role = (user?.role ?? "").toUpperCase();
  if (!user || !["ADMIN", "HR"].includes(role)) redirect("/signin");

  const employee = await prisma.user.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: { teams: { include: { team: true } }, attributes: { include: { attribute: true } }, manager: true },
  });
  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Employee</p>
          <h1 className="text-2xl font-semibold text-slate-900">{employee.name}</h1>
          <p className="text-sm text-slate-600">{employee.email}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/app/api/employees/${employee.id}/export`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Export data (GDPR)
          </a>
          <form action={anonymize}>
            <input type="hidden" name="userId" value={employee.id} />
            <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
              Delete / anonymize user
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <Info label="Job title" value={employee.jobTitle ?? "—"} />
          <Info label="Department" value={employee.department ?? "—"} />
          <Info label="Location" value={employee.location ?? "—"} />
          <Info label="Employee ID" value={employee.employeeId ?? "—"} />
          <Info label="Manager" value={employee.manager?.name ?? "—"} />
          <Info label="Teams" value={employee.teams.map((t: any) => t.team.name).join(", ") || "—"} />
        </dl>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Custom attributes</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          {employee.attributes.length === 0 && <p className="text-sm text-slate-600">No custom attributes.</p>}
          {employee.attributes.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-800">{a.attribute.label}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {a.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
