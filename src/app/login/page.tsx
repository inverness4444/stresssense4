"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/app/overview");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Use demo credentials: hr@demo.local, manager@demo.local, employee@demo.local (password: StressDemo123!)</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const email = (form.elements.namedItem("email") as HTMLInputElement).value;
            const password = (form.elements.namedItem("password") as HTMLInputElement).value;
            await signIn("credentials", { email, password, callbackUrl: "/app/overview" });
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              name="email"
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
              defaultValue="hr@demo.local"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              name="password"
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
              defaultValue="StressDemo123!"
            />
          </div>
          <button type="submit" className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
