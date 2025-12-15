import Link from "next/link";
import { signupAction } from "./actions";

export default function SignupPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const ref = (searchParams?.ref as string) ?? "";
  const planFromQuery = (searchParams?.plan as string) ?? "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-indigo-100/60">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Start your stress trial</p>
            <h1 className="text-3xl font-semibold text-slate-900">Create your StressSense workspace</h1>
            <p className="text-sm text-slate-600">14-day free trial. No credit card required to start.</p>
          </div>
          <form action={signupAction} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Work email</span>
              <input name="email" type="email" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Full name</span>
              <input name="name" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Company name</span>
              <input name="company" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Team size</span>
              <select name="size" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="20-50">20-50</option>
                <option value="50-200">50-200</option>
                <option value="200-1000">200-1000</option>
                <option value="1000+">1000+</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Password</span>
              <input name="password" type="password" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" name="trial" defaultChecked /> Start 14-day free trial
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Plan</span>
              <select name="plan" defaultValue={planFromQuery || "free"} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Promo code</span>
              <input name="promoCode" placeholder="PROMO2025" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <input type="hidden" name="ref" value={ref} />
            <div className="md:col-span-2">
              <button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-sm font-semibold text-white shadow-sm">
                Create workspace
              </button>
            </div>
          </form>
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
