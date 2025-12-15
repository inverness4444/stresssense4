import { redirect } from "next/navigation";
import { partnerSignIn, getPartnerUser } from "@/lib/partnerAuth";

export default async function PartnerSignInPage() {
  const user = await getPartnerUser();
  if (user) redirect("/partner/workspaces");

  async function signIn(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string) ?? "";
    const password = (formData.get("password") as string) ?? "";
    const ok = await partnerSignIn(email, password);
    if (!ok) return;
    redirect("/partner/workspaces");
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Partner sign in</h1>
      <form action={signIn} className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input name="password" type="password" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" required />
        </div>
        <button className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">Sign in</button>
      </form>
    </div>
  );
}
