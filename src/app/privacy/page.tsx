import { getLocale } from "@/lib/i18n-server";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">
          {isRu ? "Политика конфиденциальности StressSense" : "StressSense Privacy Policy"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isRu ? "Дата обновления: 16 декабря 2025" : "Last updated: December 16, 2025"}
        </p>
        <p className="mt-4 text-sm text-slate-700">
          {isRu
            ? "Эта политика описывает, какие данные обрабатывает StressSense, зачем мы это делаем, с кем можем делиться данными и какие права есть у пользователей. Мы придерживаемся принципов минимизации: собираем только то, что необходимо для работы сервиса."
            : "This policy describes what data StressSense processes, why we do it, who we may share it with, and what rights users have. We follow data minimization principles: we collect only what is necessary to provide the Service."}
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "1. Кто мы" : "1. Who we are"}</h2>
            <p>{isRu ? "StressSense — сервис для оценки и мониторинга рабочего стресса в компаниях." : "StressSense is a service for assessing and monitoring workplace stress in companies."}</p>
            <p>{isRu ? "Контакт по приватности:" : "Privacy contact:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "Почта: QuadrantStress@proton.me" : "Email: QuadrantStress@proton.me"}</li>
              <li>{isRu ? "Телеграм-канал: @QuadrantStress" : "Telegram channel: @QuadrantStress"}</li>
              <li>{isRu ? "Менеджер в Telegram: @QuadrantManager" : "Telegram manager: @QuadrantManager"}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "2. Какие данные мы обрабатываем" : "2. What data we process"}</h2>
            <p>{isRu ? "Мы можем обрабатывать следующие категории данных:" : "We may process the following categories of data:"}</p>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-slate-900">{isRu ? "2.1. Данные аккаунта и организации" : "2.1. Account and organization data"}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>{isRu ? "имя (или отображаемое имя), рабочая почта;" : "name (or display name), work email;"}</li>
                  <li>{isRu ? "роль в организации (сотрудник/менеджер/админ);" : "role in the organization (employee/manager/admin);"}</li>
                  <li>{isRu ? "принадлежность к компании/команде/подразделению;" : "company/team/department affiliation;"}</li>
                  <li>{isRu ? "настройки профиля (язык интерфейса и др.)." : "profile settings (interface language, etc.)."}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{isRu ? "2.2. Данные использования сервиса" : "2.2. Service usage data"}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>{isRu ? "события в продукте (например, вход, переходы по разделам, нажатия кнопок);" : "product events (e.g., sign-in, navigation, button clicks);"}</li>
                  <li>{isRu ? "технические параметры сессии (например, идентификаторы сессии);" : "technical session parameters (e.g., session identifiers);"}</li>
                  <li>{isRu ? "настройки, связанные с опросами (периоды, выбранные фильтры), если применимо." : "survey-related settings (periods, selected filters), if applicable."}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{isRu ? "2.3. Технические и безопасностные данные" : "2.3. Technical and security data"}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>{isRu ? "IP-адрес и время запросов (для защиты и расследования инцидентов);" : "IP address and request timestamps (for security and incident investigation);"}</li>
                  <li>{isRu ? "данные о браузере/устройстве (тип браузера, ОС, приблизительные технические характеристики)." : "browser/device data (browser type, OS, approximate device characteristics)."}</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{isRu ? "2.4. Данные опросов и стресс-метрики" : "2.4. Survey data and stress metrics"}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>{isRu ? "ответы на вопросы опросов и связанные метрики;" : "survey responses and related metrics;"}</li>
                  <li>{isRu ? "результаты и отчёты в агрегированном виде (например, по командам/периодам)." : "aggregated results and reports (e.g., by team/period)."}</li>
                </ul>
              </div>
            </div>
            <p>
              {isRu
                ? "Важно: индивидуальные ответы сотрудника не раскрываются другим пользователям в виде “кто что ответил”. Менеджеры/админы видят агрегированные результаты и тренды (если иное не предусмотрено настройками организации)."
                : 'Important: individual employee responses are not disclosed to other users as "who answered what." Managers/admins see aggregated results and trends (unless organization settings provide otherwise).'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "3. Как мы используем данные" : "3. How we use data"}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "предоставления и поддержки функций StressSense (опросы, отчёты, метрики, кабинеты);" : "providing and supporting StressSense features (surveys, reports, metrics, dashboards);"}</li>
              <li>{isRu ? "обеспечения безопасности, предотвращения злоупотреблений и расследования инцидентов;" : "ensuring security, preventing abuse, and investigating incidents;"}</li>
              <li>{isRu ? "улучшения продукта на основе обезличенной аналитики (например, какие функции используются чаще);" : "improving the product using anonymized analytics (e.g., which features are used more often);"}</li>
              <li>{isRu ? "поддержки пользователей и обработки обращений." : "supporting users and handling requests."}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "4. Правовые основания обработки" : "4. Legal bases for processing"}</h2>
            <p>{isRu ? "Если применимо, мы обрабатываем данные на следующих основаниях:" : "If applicable, we process data on the following bases:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "исполнение договора (предоставление сервиса пользователю/организации);" : "performance of a contract (providing the Service to the user/organization);"}</li>
              <li>{isRu ? "законные интересы (безопасность, улучшение сервиса, предотвращение злоупотреблений);" : "legitimate interests (security, service improvement, abuse prevention);"}</li>
              <li>{isRu ? "согласие (например, для аналитических/маркетинговых cookies, если они используются);" : "consent (for analytics/marketing cookies, if used);"}</li>
              <li>{isRu ? "правовые обязательства (в случаях, когда закон требует хранить/передавать данные)." : "legal obligations (when the law requires storage or disclosure)."}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "5. Передача данных и получатели" : "5. Data sharing and recipients"}</h2>
            <p>
              {isRu
                ? "Мы можем передавать данные поставщикам, которые помогают нам обеспечивать работу сервиса (например, хостинг, хранение данных, аналитика, отправка уведомлений) — только по договору и в объёме, необходимом для оказания услуг."
                : "We may share data with providers who help us operate the Service (e.g., hosting, data storage, analytics, notifications) under contract and only to the extent necessary to deliver the Service."}
            </p>
            <p>{isRu ? "Мы также можем раскрыть данные:" : "We may also disclose data:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "по законному требованию государственных органов;" : "in response to lawful requests by public authorities;"}</li>
              <li>{isRu ? "для защиты прав и безопасности пользователей и сервиса, если это необходимо и законно." : "to protect the rights and safety of users and the Service, when necessary and lawful."}</li>
            </ul>
            <p>{isRu ? "(Опционально) Список ключевых провайдеров/субпроцессоров может быть опубликован отдельно в разделе “Subprocessors”." : "(Optional) A list of key providers/subprocessors may be published separately in a “Subprocessors” section."}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "6. Использование ИИ" : "6. Use of AI"}</h2>
            <p>
              {isRu
                ? "StressSense может использовать инструменты ИИ для формирования инсайтов и рекомендаций. Мы стремимся передавать в ИИ минимально необходимую информацию, предпочтительно агрегированные метрики и обезличенные данные, и не передаём данные, которые не нужны для задачи (например, пароли). Если организация включает функции ИИ, результаты могут использоваться для генерации отчётов и подсказок внутри продукта."
                : "StressSense may use AI tools to generate insights and recommendations. We aim to send the minimum necessary information to AI, preferably aggregated and anonymized data, and do not send data that is not required for the task (e.g., passwords). If the organization enables AI features, results may be used to generate reports and in-product suggestions."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "7. Хранение данных" : "7. Data retention"}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "пока аккаунт/организация активны и это необходимо для работы сервиса;" : "while the account/organization is active and necessary to provide the Service;"}</li>
              <li>{isRu ? "логи безопасности — в течение разумного периода для расследования инцидентов;" : "security logs for a reasonable period to investigate incidents;"}</li>
              <li>{isRu ? "после удаления аккаунта/организации данные удаляются или обезличиваются в разумные сроки, если закон не требует иного;" : "after account/organization deletion, data is deleted or anonymized within a reasonable time unless law requires otherwise;"}</li>
              <li>{isRu ? "агрегированные статистические данные могут храниться дольше, если они не привязаны к конкретному пользователю." : "aggregated statistical data may be retained longer if it cannot be linked to a specific user."}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "8. Cookies" : "8. Cookies"}</h2>
            <p>{isRu ? "Мы используем cookies и похожие технологии:" : "We use cookies and similar technologies:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "необходимые — для работы сессии и базовой функциональности;" : "essential — for session operation and core functionality;"}</li>
              <li>{isRu ? "аналитические/маркетинговые — только если они включены и при необходимости получено согласие." : "analytics/marketing — only if enabled and with consent where required."}</li>
            </ul>
            <p>{isRu ? "Настройки cookies могут зависеть от региона и конфигурации организации." : "Cookie settings may depend on region and organization configuration."}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "9. Международные передачи" : "9. International transfers"}</h2>
            <p>
              {isRu
                ? "Данные могут обрабатываться в странах, где находятся наши провайдеры. Мы требуем от них адекватных мер защиты и, если применимо, используем договорные механизмы для международной передачи данных."
                : "Data may be processed in countries where our providers are located. We require appropriate safeguards and, where applicable, use contractual mechanisms for international data transfers."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "10. Права пользователей" : "10. User rights"}</h2>
            <p>{isRu ? "В зависимости от применимого закона вы можете иметь право:" : "Depending on applicable law, you may have the right to:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "получить доступ к данным и копию;" : "access your data and obtain a copy;"}</li>
              <li>{isRu ? "исправить неточности;" : "correct inaccuracies;"}</li>
              <li>{isRu ? "удалить данные;" : "delete data;"}</li>
              <li>{isRu ? "ограничить обработку или возразить против неё;" : "restrict processing or object to it;"}</li>
              <li>{isRu ? "получить данные в переносимом формате (если применимо);" : "receive data in a portable format (if applicable);"}</li>
              <li>{isRu ? "отозвать согласие (если обработка основана на согласии)." : "withdraw consent (where processing is based on consent)."}</li>
            </ul>
            <p>
              {isRu
                ? "Чтобы воспользоваться правами, напишите в поддержку и укажите: email аккаунта, организацию (если применимо) и суть запроса. Мы ответим в разумный срок."
                : "To exercise your rights, contact support with your account email, organization (if applicable), and the request details. We will respond within a reasonable timeframe."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">{isRu ? "11. Изменения политики" : "11. Policy changes"}</h2>
            <p>
              {isRu
                ? "Мы можем обновлять эту политику. Дата обновления указывается вверху. Существенные изменения будут дополнительно сообщены пользователям/организациям, если это требуется законом или разумно ожидается."
                : "We may update this policy. The update date is shown above. Material changes will be communicated to users/organizations when required by law or reasonably expected."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
