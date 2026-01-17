import Link from "next/link";
import { signupAction } from "./actions";
import { MIN_SEATS } from "@/config/pricing";
import { getLocale } from "@/lib/i18n-server";

export default async function SignupPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const ref = (searchParams?.ref as string) ?? "";
  const error = (searchParams?.error as string) ?? "";
  const errorMessage =
    error === "weak_password"
      ? isRu
        ? "Пароль должен быть не менее 8 символов."
        : "Password must be at least 8 characters."
      : error === "rate_limited"
        ? isRu
          ? "Слишком много попыток. Попробуйте через минуту."
          : "Too many attempts. Try again in a minute."
        : error === "invalid_size"
          ? isRu
            ? "Количество мест должно быть числом."
            : "Seats must be a number."
          : error === "terms_required"
            ? isRu
              ? "Нужно принять условия, чтобы продолжить."
              : "You must accept the terms to continue."
            : "";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-indigo-100/60">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {isRu ? "Старт пробного периода" : "Start your stress trial"}
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {isRu ? "Создайте рабочее пространство StressSense" : "Create your StressSense workspace"}
            </h1>
            <p className="text-sm text-slate-600">
              {isRu ? "7-дневный бесплатный пробный период. Карта не нужна." : "7-day free trial. No credit card required to start."}
            </p>
          </div>
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
          <form action={signupAction} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">{isRu ? "Рабочая почта" : "Work email"}</span>
              <input name="email" type="email" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">{isRu ? "Полное имя" : "Full name"}</span>
              <input name="name" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">{isRu ? "Название компании" : "Company name"}</span>
              <input name="company" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">{isRu ? "Количество мест" : "Seats"}</span>
              <input
                name="size"
                required
                inputMode="numeric"
                pattern="[0-9]+"
                min={MIN_SEATS}
                defaultValue={MIN_SEATS}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="text-xs text-slate-500">
                {isRu ? `Минимум ${MIN_SEATS} мест.` : `Minimum ${MIN_SEATS} seats.`}
              </span>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">{isRu ? "Пароль" : "Password"}</span>
              <input name="password" type="password" required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" name="trial" defaultChecked /> {isRu ? "Начать 7-дневный пробный период" : "Start 7-day free trial"}
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700 md:col-span-2">
              <input type="checkbox" name="termsAccepted" required className="mt-1" />
              <span>
                {isRu ? "Я прочитал(а) и принимаю " : "I have read and agree to the "}
                <Link href="/terms" className="font-semibold text-primary hover:underline">
                  {isRu ? "Условия использования" : "Terms of use"}
                </Link>{" "}
                {isRu ? "и " : "and "}
                <Link href="/privacy" className="font-semibold text-primary hover:underline">
                  {isRu ? "Политику конфиденциальности" : "Privacy policy"}
                </Link>
                .
              </span>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-800">{isRu ? "Промокод" : "Promo code"}</span>
              <input name="promoCode" placeholder="PROMO2025" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <input type="hidden" name="ref" value={ref} />
            <div className="md:col-span-2">
              <button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-strong px-4 py-3 text-sm font-semibold text-white shadow-sm">
                {isRu ? "Создать пространство" : "Create workspace"}
              </button>
            </div>
          </form>
          <p className="text-sm text-slate-600">
            {isRu ? "Уже есть аккаунт?" : "Already have an account?"}{" "}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
              {isRu ? "Войти" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
