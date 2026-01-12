import { getLocale } from "@/lib/i18n-server";

export default async function FaqPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";
  const title = isRu ? "FAQ — популярные вопросы и ответы" : "FAQ — common questions and answers";
  const subtitle = isRu
    ? "Ответы на ключевые вопросы о StressSense, приватности и использовании данных."
    : "Answers to key questions about StressSense, privacy, and data usage.";
  const items = isRu
    ? [
        {
          question: "Видит ли менеджер индивидуальные ответы сотрудника?",
          answer:
            "Нет. Менеджеры и админы видят только агрегированные результаты по командам/периодам. Индивидуальные ответы доступны самому сотруднику в его личном кабинете (если функция включена).",
        },
        {
          question: "Можно ли использовать результаты для наказаний, увольнений или KPI конкретного человека?",
          answer:
            "Мы не рекомендуем использовать StressSense для карательных решений. Сервис предназначен для улучшения условий работы и снижения стресса на уровне команд и процессов. Лучшие результаты даёт использование данных для поддержки, планирования нагрузки и улучшения коммуникации.",
        },
        {
          question: "Насколько анонимны результаты?",
          answer:
            "На уровне команд результаты агрегируются. При очень маленьких группах (например, 1–3 человека) мы рекомендуем включать порог анонимности: показывать метрики только если ответило достаточно людей, чтобы нельзя было косвенно определить конкретного сотрудника.",
        },
        {
          question: "Что будет, если отвечает мало людей?",
          answer:
            "Если выборка маленькая, отчёт может быть менее точным. Мы показываем размер выборки и можем скрывать чувствительные срезы, пока не наберётся минимальный порог ответов.",
        },
        {
          question: "Как часто нужно проводить опросы?",
          answer:
            "Оптимально — 1 короткий опрос в день или 2–3 раза в неделю (в зависимости от культуры и нагрузки). Важно, чтобы это занимало 30–60 секунд и не вызывало “усталость от опросов”.",
        },
        {
          question: "На каких языках работает сервис?",
          answer: "Поддерживаются русский и английский интерфейс. Вопросы и подсказки отображаются на выбранном языке.",
        },
        {
          question: "Какие роли есть в системе?",
          answer:
            "Обычно: сотрудник, менеджер, администратор. Права зависят от роли: сотрудники видят свой кабинет и опросы; менеджеры — агрегаты команды; администратор — агрегаты компании и настройки.",
        },
        {
          question: "Как сотрудники попадают “в нужную компанию”?",
          answer:
            "Организация создаёт рабочее пространство и приглашает сотрудников по ссылке/инвайту. Так сотрудники автоматически привязываются к нужной компании при регистрации.",
        },
        {
          question: "Что именно измеряет “индекс стресса”?",
          answer:
            "Это композитный показатель на основе ответов опросов по ключевым драйверам: нагрузка, ясность, поддержка, фокус, коммуникация, границы work-life и т.д. Он помогает видеть тренды и зоны риска, а не ставит диагноз.",
        },
        {
          question: "Это медицинский сервис?",
          answer:
            "Нет. StressSense — продукт для wellbeing на работе и организационной аналитики. Он не диагностирует заболевания и не заменяет консультации специалистов.",
        },
        {
          question: "Как вы защищаете данные?",
          answer:
            "Мы используем шифрование при передаче, контроль доступа по ролям и журналы безопасности. Доступ к данным ограничен в соответствии с ролями и принадлежностью к организации.",
        },
        {
          question: "Что передаётся в ИИ и что не передаётся?",
          answer:
            "Для AI-инсайтов мы стараемся использовать обезличенные агрегаты (тренды, средние значения, дельты). Мы не отправляем пароли и не используем ИИ для доступа к чужим данным.",
        },
        {
          question: "Можно ли отключить AI-функции?",
          answer:
            "Да, при необходимости AI можно отключить на уровне организации (если у тебя это планируется). Тогда останутся “обычные” отчёты и графики без AI-инсайтов.",
        },
        {
          question: "Где хранятся данные и можно ли удалить их полностью?",
          answer:
            "Данные хранятся у наших провайдеров инфраструктуры. По запросу можно удалить аккаунт/организацию. После удаления данные удаляются или обезличиваются в разумные сроки, если закон не требует иного.",
        },
        {
          question: "Можно ли выгрузить данные (экспорт)?",
          answer:
            "Да, по запросу или через интерфейс (если включено) можно выгрузить агрегаты/отчёты. Индивидуальные ответы — только в рамках прав доступа.",
        },
        {
          question: "Почему показатели иногда “скачут”?",
          answer:
            "Стресс может меняться волнообразно из-за дедлайнов, изменений, конфликтов или сезонной нагрузки. Также на стабильность влияет размер выборки и регулярность ответов.",
        },
        {
          question: "Как быстро я увижу пользу после внедрения?",
          answer:
            "Часто первые инсайты появляются уже через 1–2 недели регулярных ответов: видно тренд, зоны риска и драйверы. Стабильная картина — через 4–6 недель.",
        },
      ]
    : [
        {
          question: "Can a manager see an employee’s individual answers?",
          answer:
            "No. Managers and admins only see aggregated results by team and period. Individual answers are visible only to the employee in their personal dashboard (if enabled).",
        },
        {
          question: "Can results be used for punishment, termination, or individual KPIs?",
          answer:
            "We do not recommend using StressSense for punitive decisions. The service is designed to improve working conditions and reduce stress at team and process levels. Best results come from support, workload planning, and better communication.",
        },
        {
          question: "How anonymous are the results?",
          answer:
            "Results are aggregated at the team level. For very small groups (e.g., 1–3 people), we recommend an anonymity threshold so metrics are shown only when enough people respond.",
        },
        {
          question: "What happens if too few people respond?",
          answer:
            "With a small sample, reports can be less accurate. We show sample size and may hide sensitive slices until a minimum threshold is reached.",
        },
        {
          question: "How often should we run surveys?",
          answer:
            "Optimal cadence is one short survey per day or 2–3 times per week (depending on culture and workload). Keep it 30–60 seconds to avoid survey fatigue.",
        },
        {
          question: "What languages are supported?",
          answer: "Russian and English interfaces are supported. Questions and hints are shown in the selected language.",
        },
        {
          question: "What roles exist in the system?",
          answer:
            "Typical roles: employee, manager, admin. Permissions depend on role: employees see their own dashboard and surveys; managers see team aggregates; admins see company aggregates and settings.",
        },
        {
          question: "How do employees join the right company?",
          answer:
            "An organization creates a workspace and invites employees via a link/invite. Employees are then automatically linked to the correct company during signup.",
        },
        {
          question: "What does the “stress index” measure?",
          answer:
            "It is a composite indicator based on survey answers across key drivers: workload, clarity, support, focus, communication, work-life boundaries, etc. It helps track trends and risk areas, not diagnose.",
        },
        {
          question: "Is this a medical service?",
          answer:
            "No. StressSense is a workplace wellbeing and organizational analytics product. It does not diagnose conditions and does not replace professional care.",
        },
        {
          question: "How do you protect data?",
          answer:
            "We use encryption in transit, role-based access controls, and security logs. Access is limited by role and organization membership.",
        },
        {
          question: "What is sent to AI and what is not?",
          answer:
            "For AI insights we use de-identified aggregates (trends, averages, deltas). We do not send passwords and do not use AI to access other data.",
        },
        {
          question: "Can AI features be disabled?",
          answer:
            "Yes, AI can be disabled at the organization level (if configured). Standard reports and charts remain without AI insights.",
        },
        {
          question: "Where is data stored and can it be fully deleted?",
          answer:
            "Data is stored with our infrastructure providers. You can request account/organization deletion. After deletion, data is removed or anonymized within reasonable timeframes unless law requires otherwise.",
        },
        {
          question: "Can we export data?",
          answer:
            "Yes. Aggregates and reports can be exported via the interface or by request (if enabled). Individual answers follow access rights.",
        },
        {
          question: "Why do metrics sometimes fluctuate?",
          answer:
            "Stress can change due to deadlines, changes, conflicts, or seasonal load. Stability also depends on sample size and response regularity.",
        },
        {
          question: "How soon will we see value after rollout?",
          answer:
            "Initial insights often appear within 1–2 weeks of regular responses (trends and risk areas). A stable picture usually takes 4–6 weeks.",
        },
      ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">FAQ</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

        <ol className="mt-8 space-y-4">
          {items.map((item, index) => (
            <li
              key={item.question}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{item.question}</p>
                <p className="mt-1 text-slate-600">{item.answer}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
