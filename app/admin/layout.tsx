import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getAdminSession, requireAdmin } from "@/lib/admin";
import { getOpenReportCount } from "@/lib/admin-queries";
import { AdminNav } from "@/components/admin/AdminNav";

/*
  Обвязка админки: заголовок и навигация по разделам.

  ВАЖНО: layout здесь — не граница доступа. `requireAdmin()` ниже стоит ради
  того, чтобы не рендерить обвязку постороннему, но настоящий гард обязан
  быть в КАЖДОЙ странице под `app/admin` и в КАЖДОМ экшене. Причина — в доках
  самого Next (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`):
  layout не перерендеривается при клиентской навигации и не управляет тем,
  рендерится ли остальной роут. Тот же приём, что с владением постом в
  `/post/[id]/edit`: гард на обоих уровнях, не только в UI.

  Ширина `max-w-5xl`, как у шапки сайта, а не `max-w-2xl`: узкая колонка
  существует ради длины строки прозы, а здесь будут таблицы.
*/

/*
  Заголовок вкладки считается по роли, а не лежит статикой. Причина измерена
  2026-09-12 на прод-сборке: статический `metadata` резолвится и уходит в <head>
  РАНЬШЕ, чем `notFound()` из страницы обрубит тело, поэтому анонимный
  `curl /admin` получал 200 и честное `<title>Администрирование</title>` —
  то есть прямое подтверждение, что закрытый раздел существует, ради сокрытия
  которого в `requireAdmin()` и выбран `notFound()` вместо редиректа.

  Здесь же роль проверяется до отдачи заголовка, и посторонний получает тот же
  титул, что у любой ненайденной страницы.

  Цена — ещё один `getSession()` на запрос к админке (третий: layout, страница,
  и вот этот). Соглашаемся: разделом пользуется один человек, а лишний round-trip
  за роль дешевле, чем маскировка, которая не работает.

  ВАЖНО, что этим НЕ закрывается: в дев-режиме в <head> всё равно уезжает
  <script src=...components_admin_AdminNav_tsx...> — путь к чанку клиентского
  компонента layout'а. В прод-сборке имена чанков хэшируются, и проверка
  показала, что слова `admin` там не остаётся нигде, кроме самого запрошенного
  адреса в RSC-пейлоаде — а его запросивший и так набрал руками.

  И всё равно: маскировка — косметика поверх настоящего гарда, а не защита.
  Ломается она незаметно (как сломалась заголовком), так что доступ обязан
  держаться на `requireAdmin()` в каждой странице и `getAdminSession()`
  в каждом экшене.
*/
export async function generateMetadata(): Promise<Metadata> {
  const session = await getAdminSession();

  return {
    title: session ? "Администрирование" : "Страница не найдена",
    // Подстраховка поверх 404: для краулера админки и так не существует,
    // но запрет на индексацию стоит копейку.
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  /*
    Один лишний `count()` на страницу админки — цена бейджа очереди. В шапку
    сайта такой счётчик не тащим по обратному доводу: там он выполнялся бы
    у каждого посетителя на каждой смене маршрута ради цифры одному человеку.
  */
  const openReportCount = await getOpenReportCount();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4">
        <h1 className="font-serif text-2xl tracking-tight text-ink">
          Администрирование
        </h1>
        <AdminNav openReportCount={openReportCount} />
      </header>

      {children}
    </div>
  );
}
