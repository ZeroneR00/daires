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
  должно. Плановый порядок: Обзор · Записи · Комментарии · Пользователи ·
  Жалобы · Треки.
*/

const sections = [{ href: "/admin", label: "Обзор" }];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {sections.map((section) => {
        // Точное сравнение, а не startsWith: иначе «Обзор» (`/admin`) горел бы
        // активным на каждой вложенной странице раздела.
        const active = pathname === section.href;

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
          </Link>
        );
      })}
    </nav>
  );
}
