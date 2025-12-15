export default function SectionPeopleCompOnboarding() {
  const cards = [
    {
      title: "People management",
      text: "1:1, цели, feedback и recognition в одном потоке. Менеджер и HR видят прогресс и риски без микроменеджмента.",
      cta: "See how it works",
      href: "#manager",
    },
    {
      title: "Compensation & fairness",
      text: "Bands, review cycles, рекомендации и контроль справедливости — без раскрытия лишнего и с учётом приватности.",
      cta: "Learn about comp",
      href: "#people",
    },
    {
      title: "Onboarding & journeys",
      text: "30/60/90-day планы, чек-листы, шаги с курсами, привычками и 1:1. Прогресс и nudges по расписанию.",
      cta: "View journeys",
      href: "#people",
    },
  ];

  return (
    <section id="people" className="bg-slate-50/80 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">People, Compensation & Onboarding</p>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Все People-процессы в одной платформе</h2>
          <p className="mx-auto max-w-3xl text-slate-600">
            От People-хаба до компенсации и онбординга: StressSense связывает данные, действия и обучение, чтобы команда росла устойчиво.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="flex h-full flex-col rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">★</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{card.text}</p>
              <a href={card.href} className="mt-4 text-sm font-semibold text-primary hover:text-primary-strong">
                {card.cta} →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
