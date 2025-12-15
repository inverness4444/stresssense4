const logos = ["Nova Bank", "GridSoft", "Sparkline", "Bright HR", "Northwind", "PulseLabs"];

export default function SocialProof() {
  return (
    <section className="bg-white py-10" aria-label="Social proof">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Выбор команд, которые заботятся о людях</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-500">
          {logos.map((logo) => (
            <div
              key={logo}
              className="rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2 text-slate-500 shadow-sm"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
