"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StressSenseAiWidget } from "../../../components/StressSenseAiWidget";
import { createDemoOrganization } from "@/lib/orgData";

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export default function GetStartedPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [agree, setAgree] = useState(false);
  const [plan] = useState("StressSense — оценка стресса команд");
  const isReady = isValidEmail(email) && agree;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;
    const { org } = await createDemoOrganization(orgName || "Новая компания", email);
    document.cookie = `ss_user_id=demo:${org.slug}:manager; path=/`;
    router.push("/app/overview");
  };

  const logos = ["Nova Bank", "GridSoft", "Sparkline", "Bright HR", "Acme Labs"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-28 lg:flex-row lg:items-start lg:gap-16 lg:px-8">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Start free trial
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Присоединяйтесь к компаниям, которые видят стресс команд до выгорания.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            StressSense помогает измерять стресс и вовлечённость, видеть рисковые команды и давать менеджерам подсказки, пока проблемы не стали кризисом.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="font-semibold text-slate-600">Нам доверяют</span>
            {logos.map((logo) => (
              <span key={logo} className="rounded-full border border-slate-200 px-3 py-1 text-slate-700">
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xl">
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-indigo-100/40 ring-1 ring-slate-200/70">
            <h2 className="text-2xl font-semibold text-slate-900">Давайте начнём</h2>
            <p className="mt-2 text-sm text-slate-600">Начните бесплатный trial, чтобы за пару недель увидеть реальную картину стресса в ваших командах.</p>
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Что вы хотите попробовать?
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                  value={plan}
                  onChange={() => {}}
                >
                  <option>StressSense — оценка стресса команд</option>
                  <option>StressSense + AI-подсказки для менеджеров</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Business email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                  placeholder="you@company.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Название компании (необязательно)
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                  placeholder="Acme Inc"
                />
              </label>

              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-primary" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  Я согласен(на) с условиями и политикой конфиденциальности StressSense.
                </span>
              </label>

              <button
                type="submit"
                disabled={!isReady}
                className={`w-full rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition duration-200 ${
                  isReady ? "bg-gradient-to-r from-primary to-primary-strong hover:scale-[1.01]" : "bg-slate-300 text-slate-500"
                }`}
              >
                Начать бесплатный trial
              </button>
              <p className="text-xs text-slate-500">Мы используем данные только для запуска demo-workspace. Можно остановить trial в любой момент.</p>
            </form>
          </div>
        </div>
      </div>
      <StressSenseAiWidget mode="landing" />
    </div>
  );
}
