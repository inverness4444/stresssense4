import { getLocale } from "@/lib/i18n-server";

export default async function TermsPage() {
  const locale = await getLocale();
  const isRu = locale === "ru";

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">
          {isRu ? "Условия использования StressSense" : "StressSense Terms of Service"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isRu ? "Дата обновления: 16 декабря 2025" : "Last updated: December 16, 2025"}
        </p>
        <p className="mt-4 text-sm text-slate-700">
          {isRu
            ? "Эти условия регулируют доступ и использование сервиса StressSense (“Сервис”). Используя Сервис, вы подтверждаете, что согласны с этими условиями и Политикой конфиденциальности."
            : 'These terms govern access to and use of the StressSense service ("Service"). By using the Service, you confirm that you agree to these terms and the Privacy Policy.'}
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "1. Принятие условий" : "1. Acceptance of terms"}
            </h2>
            <p>
              {isRu
                ? "Доступ к StressSense предоставляется только при согласии с настоящими условиями и Политикой конфиденциальности. Если вы используете сервис от имени организации, вы подтверждаете, что уполномочены принимать условия от имени этой организации."
                : "Access to StressSense is provided only if you accept these terms and the Privacy Policy. If you use the Service on behalf of an organization, you confirm that you are authorized to accept the terms on behalf of that organization."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "2. Кому предназначен сервис" : "2. Who the Service is for"}
            </h2>
            <p>
              {isRu
                ? "Сервис предназначен для организаций и их сотрудников. Пользователь должен быть достигшим возраста, допускаемого для заключения договоров в его юрисдикции."
                : "The Service is intended for organizations and their employees. The user must be of legal age to enter into contracts in their jurisdiction."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "3. Аккаунты и безопасность" : "3. Accounts and security"}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "Вы обязуетесь предоставлять корректные данные при регистрации и поддерживать их актуальность."
                  : "You agree to provide accurate registration data and keep it up to date."}
              </li>
              <li>
                {isRu
                  ? "Вы несёте ответственность за сохранность учётных данных и доступ к аккаунту."
                  : "You are responsible for safeguarding your credentials and account access."}
              </li>
              <li>
                {isRu
                  ? "Если вы подозреваете компрометацию доступа или несанкционированную активность — сообщите нам через каналы поддержки."
                  : "If you suspect compromised access or unauthorized activity, contact us via support channels."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "4. Допустимое использование" : "4. Acceptable use"}
            </h2>
            <p>{isRu ? "Запрещено:" : "Prohibited:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "спам, попытки взлома, обход ограничений, вмешательство в работу сервиса, сканирование уязвимостей без согласования;"
                  : "spam, hacking attempts, bypassing restrictions, interference with the Service, or vulnerability scanning without authorization;"}
              </li>
              <li>
                {isRu
                  ? "использование сервиса для незаконных действий или нарушений применимых законов;"
                  : "using the Service for unlawful activities or violations of applicable laws;"}
              </li>
              <li>
                {isRu
                  ? "дискриминация, угрозы, травля, публикация вредоносного ПО или материалов, нарушающих права третьих лиц;"
                  : "discrimination, threats, harassment, distribution of malware, or content that infringes third-party rights;"}
              </li>
              <li>
                {isRu
                  ? "извлечение данных и попытки доступа к данным других организаций."
                  : "scraping data or attempting to access data from other organizations."}
              </li>
            </ul>
            <p>
              {isRu
                ? "Мы можем ограничивать или блокировать доступ при нарушении этих правил или при угрозе безопасности сервиса."
                : "We may restrict or block access if these rules are violated or if there is a security risk to the Service."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "5. Опросы, аналитика и ответственность организации" : "5. Surveys, analytics, and organization responsibility"}
            </h2>
            <p>
              {isRu
                ? "StressSense предназначен для оценки и мониторинга рабочего стресса и предоставления аналитики. Организация обязуется использовать результаты сервиса ответственно и в соответствии с применимым трудовым и privacy-законодательством."
                : "StressSense is designed to assess and monitor workplace stress and provide analytics. The organization agrees to use results responsibly and in accordance with applicable labor and privacy laws."}
            </p>
            <p>
              {isRu
                ? "Сервис не предназначен для принятия автоматизированных решений, имеющих юридические последствия для сотрудника, без участия человека."
                : "The Service is not intended for automated decision-making that has legal effects on an employee without human involvement."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "6. Контент пользователей" : "6. User content"}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "Контент и данные, которые вы загружаете или создаёте в сервисе (включая ответы опросов), остаются вашей собственностью или собственностью вашей организации."
                  : "Content and data you upload or create in the Service (including survey responses) remain your property or the property of your organization."}
              </li>
              <li>
                {isRu
                  ? "Вы предоставляете StressSense ограниченную лицензию на обработку и отображение контента исключительно для работы сервиса (хостинг, анализ, формирование отчётов)."
                  : "You grant StressSense a limited license to process and display content solely to provide the Service (hosting, analysis, reporting)."}
              </li>
              <li>
                {isRu
                  ? "Вы гарантируете, что имеете право предоставлять такой контент и что он не нарушает закон и права третьих лиц."
                  : "You warrant that you have the right to provide such content and that it does not violate laws or third-party rights."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "7. Подписки, тарификация и платежи" : "7. Subscriptions, pricing, and payments"}
            </h2>
            <p>{isRu ? "Если применимо:" : "If applicable:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "Сервис может предоставляться по подписке. Стоимость рассчитывается по количеству мест (per seat) с минимальным количеством мест; актуальная цена отображается в интерфейсе или договоре."
                  : "The Service may be provided by subscription. Pricing is based on seats (per seat) with a minimum seat count; current pricing is shown in the interface or agreement."}
              </li>
              <li>
                {isRu
                  ? "Организация/плательщик отвечает за оплату и актуальность платёжных данных."
                  : "The organization/payer is responsible for payment and up-to-date billing details."}
              </li>
              <li>
                {isRu
                  ? "Мы можем изменять цены и условия тарификации, уведомляя о существенных изменениях заранее, если это разумно возможно."
                  : "We may change prices and billing terms, notifying you of material changes in advance when reasonably possible."}
              </li>
              <li>
                {isRu
                  ? "При просрочке оплаты мы можем ограничить функции или доступ, предварительно уведомив (если возможно)."
                  : "If payment is overdue, we may limit features or access, with prior notice when possible."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "8. Возвраты и отмена" : "8. Refunds and cancellation"}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "Правила отмены подписки и возвратов (если предусмотрены) описываются в интерфейсе биллинга или отдельной “Billing Policy”."
                  : "Cancellation and refund rules (if offered) are described in the billing interface or a separate Billing Policy."}
              </li>
              <li>
                {isRu
                  ? "Если возвраты не предусмотрены — лучше прямо так и написать, чтобы потом не было конфликтов (“оплата за период не возвращается, кроме случаев, предусмотренных законом”)."
                  : "If refunds are not offered, state it explicitly to avoid disputes (\"payments for a period are non-refundable except as required by law\")."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "9. Интеллектуальная собственность" : "9. Intellectual property"}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "Все права на код, дизайн, интерфейс и материалы StressSense принадлежат владельцу сервиса или его лицензиарам, если не указано иное."
                  : "All rights to the code, design, interface, and materials of StressSense belong to the service owner or its licensors, unless stated otherwise."}
              </li>
              <li>
                {isRu
                  ? "Вы не получаете никаких прав на исходный код или товарные знаки, кроме права использования сервиса по назначению."
                  : "You do not receive any rights to source code or trademarks beyond the right to use the Service as intended."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "10. Сторонние сервисы" : "10. Third-party services"}
            </h2>
            <p>
              {isRu
                ? "Сервис может использовать сторонних провайдеров (хостинг, аналитика, уведомления, платёжные решения, инструменты ИИ). Их работа может регулироваться отдельными условиями таких провайдеров. Мы не отвечаем за работу сторонних сервисов вне контроля StressSense, в пределах, допускаемых законом."
                : "The Service may use third-party providers (hosting, analytics, notifications, payment solutions, AI tools). Their services may be governed by separate terms. We are not responsible for third-party services outside StressSense control, to the extent permitted by law."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "11. Отказ от гарантий" : "11. Disclaimer of warranties"}
            </h2>
            <p>
              {isRu
                ? "Сервис предоставляется “как есть” и “как доступно”. Мы не гарантируем безошибочную или непрерывную работу, однако стремимся поддерживать стабильность и безопасность сервиса."
                : 'The Service is provided "as is" and "as available." We do not guarantee uninterrupted or error-free operation, but we strive to maintain stability and security.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "12. Ограничение ответственности" : "12. Limitation of liability"}
            </h2>
            <p>{isRu ? "В пределах, допускаемых законом:" : "To the extent permitted by law:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "StressSense не несёт ответственности за косвенные убытки, упущенную выгоду или потерю данных, если иное не предусмотрено обязательными нормами права."
                  : "StressSense is not liable for indirect damages, lost profits, or data loss unless mandatory law provides otherwise."}
              </li>
              <li>
                {isRu
                  ? "Совокупная ответственность за прямые убытки ограничивается суммой, уплаченной за сервис за определённый период (например, за последние 3 месяца) — можно добавить, это стандартно для B2B."
                  : "Total liability for direct damages is limited to the amount paid for the Service over a specified period (for example, the last 3 months), which is standard for B2B."}
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "13. Приостановка и прекращение доступа" : "13. Suspension and termination"}
            </h2>
            <p>{isRu ? "Мы можем приостановить или прекратить доступ к сервису:" : "We may suspend or terminate access to the Service:"}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{isRu ? "при нарушении условий или подозрении на злоупотребления;" : "for violations of the terms or suspected abuse;"}</li>
              <li>{isRu ? "при угрозе безопасности сервиса или пользователей;" : "if there is a security risk to the Service or users;"}</li>
              <li>{isRu ? "при неоплате (если применимо)." : "for non-payment (if applicable)."}</li>
            </ul>
            <p>
              {isRu
                ? "По возможности мы будем уведомлять заранее, кроме случаев, когда это может навредить безопасности."
                : "When possible, we will provide advance notice unless doing so could harm security."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "14. Изменения условий" : "14. Changes to terms"}
            </h2>
            <p>
              {isRu
                ? "Мы можем обновлять условия. Новая редакция вступает в силу с момента публикации, если не указано иное. Существенные изменения мы постараемся сообщать дополнительно."
                : "We may update these terms. A new version takes effect upon publication unless stated otherwise. We will try to provide additional notice of material changes."}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {isRu ? "15. Применимое право и юрисдикция" : "15. Governing law and jurisdiction"}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {isRu
                  ? "Эти условия регулируются в соответствии с применимым законодательством"
                  : "These terms are governed by applicable law."}
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
