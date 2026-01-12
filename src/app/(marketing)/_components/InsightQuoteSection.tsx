import { getLocale } from "@/lib/i18n-server";

export default async function InsightQuoteSection() {
  const locale = await getLocale();
  const isRu = locale === "ru";

  return (
    <section id="insight" className="bg-[#0b1444] py-16 text-white sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
          {isRu ? "Знаете ли вы, как чувствуют себя ваши сотрудники?" : "Do you know how your employees feel?"}
        </p>
        <h2 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
          {isRu ? (
            <>
              Сотрудники, которые чувствуют <em className="font-medium italic">связь</em> с культурой компании,
              на 47% реже ищут другую работу
            </>
          ) : (
            <>
              Employees who feel <em className="font-medium italic">connected</em> to their culture are 47% less likely
              to be looking for another job
            </>
          )}
        </h2>
      </div>
    </section>
  );
}
