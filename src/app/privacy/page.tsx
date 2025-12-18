export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Политика конфиденциальности StressSense</h1>
        <p className="mt-2 text-sm text-slate-600">Last updated: 16 декабря 2025</p>
        <p className="mt-4 text-sm text-slate-700">
          Эта политика описывает, какие данные может обрабатывать StressSense, как они используются и какие права есть у пользователей.
          Мы строим сервис с учётом приватности и минимизации данных.
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Какие данные мы можем собирать</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Данные аккаунта: имя, рабочая почта, роль и принадлежность к организации/команде.</li>
              <li>Данные использования: события в продукте, настройки, язык интерфейса.</li>
              <li>Данные устройства: тип браузера, IP в логах безопасности, время запросов.</li>
              <li>Ответы опросов и метрики команд — в агрегированном виде, без раскрытия личных ответов другим пользователям.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Как мы используем данные</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Предоставление и улучшение функций StressSense.</li>
              <li>Обеспечение безопасности, предотвращение злоупотреблений и расследование инцидентов.</li>
              <li>Аналитика использования и продуктовые метрики в обезличенном виде.</li>
              <li>Поддержка пользователей и обработка запросов.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Правовые основания</h2>
            <p>Для пользователей ЕС/ЕЭЗ обработка может основываться на исполнении договора, законных интересах (улучшение и защита сервиса) и согласии, когда это требуется.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Передача и sharing</h2>
            <p>Мы можем делиться данными с провайдерами хостинга, аналитики и уведомлений, строго по договору и только для работы сервиса. Возможна передача по запросам правоохранительных органов, если это требуется законом.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Хранение данных</h2>
            <p>Данные хранятся столько, сколько нужно для предоставления сервиса и соблюдения требований закона. Агрегаты могут храниться дольше для статистики без привязки к пользователю.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Безопасность</h2>
            <p>Мы используем шифрование при передаче, контроль доступа по ролям и журналы безопасности. Полная защита не гарантируется, но мы регулярно улучшаем меры безопасности.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Cookies</h2>
            <p>Сервис может использовать необходимые cookies для сессий и, по необходимости, аналитические cookies. Настройки могут быть добавлены позже, о чём мы сообщим.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Права пользователей</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Доступ, исправление или удаление персональных данных по запросу, если это допускает закон.</li>
              <li>Возражение против обработки и переносимость данных (если применимо по GDPR).</li>
              <li>Отзыв согласия там, где оно является основанием обработки.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Международные передачи</h2>
            <p>Данные могут обрабатываться в странах, где находятся наши провайдеры. Мы требуем от них адекватных мер защиты и соблюдения применимых стандартов.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Изменения политики</h2>
            <p>Мы можем обновлять политику и будем указывать дату последнего обновления. Существенные изменения будут коммуницированы дополнительно.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Контакты</h2>
            <p>По вопросам приватности свяжитесь с командой StressSense через указанные каналы поддержки.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
