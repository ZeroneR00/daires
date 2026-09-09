import { requireAdmin } from "@/lib/admin";

/*
  Заглушка первого шага: дашборд со счётчиками приезжает следующим этапом.
  Страница существует уже сейчас, потому что именно на ней проверяется гард —
  админ видит текст, любой другой (и аноним) получает 404.

  `requireAdmin()` продублирован здесь при том, что он же стоит в layout, —
  это не копипаста: layout не решает, отрендерится ли страница, см. комментарий
  в `app/admin/layout.tsx`.
*/

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await requireAdmin();

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Вошёл как <span className="text-ink">{session.user.username}</span>.
      </p>
      <p className="text-sm text-muted">
        Здесь появится сводка по сайту: пользователи, записи, комментарии,
        жалобы и осиротевшие треки.
      </p>
    </section>
  );
}
