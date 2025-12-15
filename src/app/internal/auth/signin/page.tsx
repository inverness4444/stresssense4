import { internalSignIn } from "@/lib/internalAuth";
import { redirect } from "next/navigation";

async function signInAction(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";
  const user = await internalSignIn(email, password);
  if (!user) return;
  redirect("/internal/analytics");
}

export default function InternalSignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form action={signInAction} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Internal</p>
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        </div>
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <button type="submit" className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-strong">
          Sign in
        </button>
      </form>
    </div>
  );
}
