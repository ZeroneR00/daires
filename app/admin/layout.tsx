import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
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

export const metadata: Metadata = {
  title: "Администрирование",
  // Подстраховка поверх 404: для анонимного краулера админки и так не
  // существует, но заголовок стоит копейку.
  robots: { index: false, follow: false },
};

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
