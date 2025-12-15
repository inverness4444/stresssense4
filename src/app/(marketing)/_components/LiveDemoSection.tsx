import Link from "next/link";
import LiveDemoPlayground from "./LiveDemoPlayground";

export default function LiveDemoSection() {
  return (
    <section id="demo" className="bg-slate-50/70 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live demo</p>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Поиграйте со StressSense прямо на сайте</h2>
            <p className="text-base text-slate-600">Manager и Employee виды с интерактивными метриками и задачами — без логина и настроек.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg">
                Открыть полноэкранное демо
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Данные симулированы</p>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <LiveDemoPlayground />
        </div>
      </div>
    </section>
  );
}
