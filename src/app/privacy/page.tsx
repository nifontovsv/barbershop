import Link from "next/link";

const POLICY_SECTIONS = [
  {
    title: "1. Какие данные мы собираем",
    body: "При записи к мастеру: имя и номер телефона — только для связи по вашей записи.\n\nДля мастеров (уведомления): push-токен устройства — чтобы отправлять вам уведомления о новых записях. Токен привязан к выбранному вами профилю мастера.",
  },
  {
    title: "2. Как мы храним данные",
    body: "Данные хранятся на сервере приложения (база данных и логи только для работы сервиса). Мы не передаём ваши имя, телефон или push-токен третьим лицам для рекламы или маркетинга. Push-уведомления доставляются через сервисы Apple (APNs) и Google (FCM) в соответствии с их политиками.",
  },
  {
    title: "3. Как долго хранятся данные",
    body: "Записи и контакты хранятся для работы сервиса записи. Push-токен хранится, пока вы не отключите уведомления в приложении. При удалении данных на стороне сервера соответствующие данные удаляются без передачи третьим лицам.",
  },
  {
    title: "4. Ваши права",
    body: "Вы можете в любой момент отключить уведомления в приложении (экран «Для мастеров»). По запросу мы можем сообщить, какие данные о вас хранятся, или удалить их.",
  },
  {
    title: "5. Изменения",
    body: "Мы можем обновлять эту политику. Актуальная версия будет доступна по ссылке в приложении или на сайте. Продолжение использования приложения после изменений означает принятие обновлённой политики.",
  },
];

export const metadata = {
  title: "Политика конфиденциальности — Barbershop",
  description: "Политика конфиденциальности сервиса записи Barbershop.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[var(--accent)] hover:underline"
        >
          ← На главную
        </Link>
        <h1 className="mb-6 text-2xl font-semibold text-[var(--text)]">
          Политика конфиденциальности
        </h1>
        <p className="mb-8 text-[var(--text-secondary)] leading-relaxed">
          Приложение Barbershop («мы») обрабатывает ваши данные в соответствии с
          этой политикой.
        </p>
        <div className="space-y-8">
          {POLICY_SECTIONS.map(({ title, body }) => (
            <section key={title}>
              <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">
                {title}
              </h2>
              <p className="whitespace-pre-line text-[var(--text-muted)] leading-relaxed">
                {body}
              </p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm italic text-[var(--text-muted)]">
          Дата последнего обновления: март 2025
        </p>
      </main>
    </div>
  );
}
