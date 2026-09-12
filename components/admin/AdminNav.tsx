"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
  Навигация по разделам админки.

  Клиентский компонент здесь безопасен, в отличие от ветки `role === "admin"`
  в шапке сайта: этот файл попадает в бандл только тех страниц, что лежат под
  `/admin`, а туда не-админа не пускает `requireAdmin()`. Существование
  админки он никому не выдаёт.

  Разделы добавляются по мере готовности — мёртвых ссылок в навигации быть не
  должно.

  Порядок не алфавитный и не случайный: сначала люди и то, что они написали,
  потом очередь жалоб, и последними треки — единственный раздел, который не
  про модерацию, а про уборку кэша.
*/

const sections = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/posts", label: "Записи" },
  { href: "/admin/comments", label: "Комментарии" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/reports", label: "Жалобы" },
  { href: "/admin/tracks", label: "Треки" },
];

/*
  Число открытых жалоб приходит пропсом из layout, а не запросом отсюда:
  компонент клиентский, в базу ему не сходить, а layout и так серверный.

  Цифра, а не точка, — в отличие от значка меню в шапке сайта: там сигнал
  «загляни», здесь очередь, и её длина решает, браться сейчас или потом.
  Ноль не рисуем вовсе: пустая очередь — не новость.
*/
interface AdminNavProps {
  openReportCount: number;
}

export function AdminNav({ openReportCount }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {sections.map((section) => {
        // «Обзор» сравниваем точно, остальные — по префиксу: иначе `/admin`
        // горел бы активным во всех разделах сразу, а «Записи» гасли бы на
        // вложенной странице подтверждения удаления.
        const active =
          section.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(section.href);

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex items-center rounded-full bg-accent-wash px-3 py-1.5 text-sm font-medium text-accent"
                : "flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-wash hover:text-accent"
            }
          >
            {section.label}
            {section.href === "/admin/reports" && openReportCount > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs font-medium text-accent-ink">
                {openReportCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
