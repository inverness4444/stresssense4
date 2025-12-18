export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Условия использования StressSense</h1>
        <p className="mt-2 text-sm text-slate-600">Last updated: 16 декабря 2025</p>
        <p className="mt-4 text-sm text-slate-700">
          Эти условия использования регулируют доступ и работу сервиса StressSense. Используя продукт, вы подтверждаете, что
          ознакомлены с условиями и обязуетесь их соблюдать.
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Принятие условий</h2>
            <p>Доступ к StressSense возможен только при согласии с этими условиями и действующей Политикой конфиденциальности.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Право на использование</h2>
            <p>Сервис предназначен для организаций и их сотрудников, достигших возраста, допустимого для заключения договоров в вашей юрисдикции.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Аккаунты и безопасность</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Вы отвечаете за точность данных аккаунта и защиту своих учётных данных.</li>
              <li>Сообщайте нам о любой подозрительной активности или компрометации доступа.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Допустимое использование</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Запрещены спам, злоупотребления, взлом, обход ограничений и нарушения применимых законов.</li>
              <li>Нельзя использовать сервис для дискриминации, угроз или распространения вредоносного ПО.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Контент пользователей</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Контент, который вы загружаете, остаётся вашей собственностью.</li>
              <li>Вы предоставляете StressSense ограниченную лицензию на отображение и обработку контента для работы сервиса.</li>
              <li>Запрещён незаконный контент и материалы, нарушающие права третьих лиц.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Подписки и платежи</h2>
            <p>Если применимо, условия подписок и тарификации могут изменяться. Мы уведомим о существенных изменениях заранее.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Интеллектуальная собственность</h2>
            <p>Все права на программный код, дизайн и материалы StressSense принадлежат Quadrant или лицензиарам, если иное не указано.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Сторонние сервисы</h2>
            <p>Сервис может интегрироваться с решениями третьих сторон. Их использование регулируется условиями соответствующих провайдеров.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Отказ от гарантий</h2>
            <p>Сервис предоставляется «как есть» без прямых или подразумеваемых гарантий пригодности или безошибочной работы.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Ограничение ответственности</h2>
            <p>Quadrant не несёт ответственности за косвенные убытки, потерю данных или упущенную выгоду, возникающие при использовании сервиса, в пределах, допускаемых законом.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Прекращение доступа</h2>
            <p>Мы можем приостанавливать или прекращать доступ при нарушении условий или угрозе безопасности сервиса.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Изменения условий</h2>
            <p>Мы можем обновлять эти условия. Новая редакция вступает в силу с момента публикации, если не указано иное.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Контакты</h2>
            <p>По вопросам условий использования свяжитесь с командой StressSense через указанные каналы поддержки.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
