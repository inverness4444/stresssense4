import Link from "next/link";
import { signupAction } from "./actions";
import { MIN_SEATS } from "@/config/pricing";

export default function SignupPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const ref = (searchParams?.ref as string) ?? "";
  const error = (searchParams?.error as string) ?? "";
  const errorMessage =
    error === "weak_password"
      ? "Password must be at least 8 characters."
      : error === "rate_limited"
        ? "Too many attempts. Try again in a minute."
          : error === "invalid_size"
          ? "Seats must be a number."
          : error === "terms_required"
            ? "You must accept the terms to continue."
        : "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-indigo-100/60">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Start your stress trial</p>
            <h1 className="text-3xl font-semibold text-slate-900">Create your StressSense workspace</h1>
            <p className="text-sm text-slate-600">7-day free trial. No credit card required to start.</p>
          </div>
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
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
              <span className="font-semibold text-slate-800">Seats</span>
              <input
                name="size"
                required
                inputMode="numeric"
                pattern="[0-9]+"
                min={MIN_SEATS}
                defaultValue={MIN_SEATS}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="text-xs text-slate-500">Minimum {MIN_SEATS} seats.</span>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">Password</span>
              <input name="password" type="password" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" name="trial" defaultChecked /> Start 7-day free trial
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700 md:col-span-2">
              <input type="checkbox" name="termsAccepted" required className="mt-1" />
              <span>
                I have read and agree to the{" "}
                <Link href="/terms" className="font-semibold text-primary hover:underline">
                  Terms of use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-primary hover:underline">
                  Privacy policy
                </Link>
                .
              </span>
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
