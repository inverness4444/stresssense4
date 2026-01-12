import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function SignInPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-indigo-100/60 md:p-10 lg:p-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/branding/quadrantlogo.PNG"
                alt="StressSense"
                className="h-12 w-auto"
              />
              <div className="leading-tight">
                <p className="text-base font-semibold text-slate-900">StressSense</p>
                <p className="text-xs font-medium text-slate-500">{t(locale, "signinSubtitle")}</p>
              </div>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">{t(locale, "signinTitle")}</h1>
            <p className="text-sm text-slate-600">
              {isRu
                ? "Войдите с рабочей почтой, чтобы управлять сотрудниками, командами и сигналами стресса."
                : "Sign in with your work email to manage employees, teams, and stress signals."}
            </p>
            <p className="text-sm text-slate-600">
              {isRu ? "Впервые здесь?" : "New here?"}{" "}
              <Link className="font-semibold text-primary" href="/">
                {isRu ? "Вернуться на сайт" : "Return to site"}
              </Link>
              .
            </p>
          </div>
          <div className="flex-1 space-y-4">
            <SignInForm locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
