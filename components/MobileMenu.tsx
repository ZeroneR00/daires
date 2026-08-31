"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "./SignOutButton";

/*
  Меню разделов для узкого экрана. На `< sm` семь элементов шапки в строку
  не влезали и растягивали документ до ~745 px при вьюпорте 390 — страница
  ехала вбок на каждом экране сайта. Разделы уезжают сюда, снаружи остаются
  только знак, «Записать», лупа и эта кнопка.

  Компонент намеренно презентационный: своих хуков не зовёт, всё приезжает
  пропсами. Сессия и счётчики читаются по-прежнему в одном месте
  (`SessionStatus`), а меню остаётся тупым и проверяемым.

  Диалог — нативный <dialog> + showModal(), третье применение идиомы после
  `SearchDialog` и `TrackPickerDialog`: Esc, ловушка фокуса и затемнение
  ::backdrop достаются даром.
*/

interface MobileMenuProps {
  username: string;
  requestCount: number;
  unreadMessages: number;
}

export function MobileMenu({
  username,
  requestCount,
  unreadMessages,
}: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Разделы уехали в панель вместе со счётчиками, а весь их смысл — попадаться
  // боковым зрением. Поэтому снаружи остаётся одна акцентная точка: она не
  // говорит «сколько», но говорит «загляни». Точные числа — внутри панели.
  const hasNotice = requestCount + unreadMessages > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Меню"
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent sm:hidden"
      >
        <MenuIcon />
        {hasNotice && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-accent"
          />
        )}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="mb-auto ml-auto mr-3 mt-16 w-60 max-w-[calc(100vw-1.5rem)] rounded-card border border-line bg-surface p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        {/* Клик по любой ссылке закрывает панель: навигация клиентская,
            сам по себе <dialog> о ней не узнает */}
        <nav
          className="flex flex-col p-2"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <MenuLink href={`/u/${username}`}>Мой дневник</MenuLink>
          <MenuLink href="/following">Моя лента</MenuLink>
          <MenuLink href="/friends">
            Друзья
            {requestCount > 0 && <NavBadge>{requestCount}</NavBadge>}
          </MenuLink>
          <MenuLink href="/messages">
            Сообщения
            {unreadMessages > 0 && <NavBadge>{unreadMessages}</NavBadge>}
          </MenuLink>

          <span aria-hidden className="my-2 h-px bg-line" />

          <MenuLink href="/settings">
            <span className="truncate">{username}</span>
            <span className="ml-auto pl-2 text-xs text-muted">Настройки</span>
          </MenuLink>
          <div className="flex" onClick={() => setOpen(false)}>
            <SignOutButton />
          </div>
        </nav>
      </dialog>
    </>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-full px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-wash hover:text-accent"
    >
      {children}
    </Link>
  );
}

/*
  Плашка-счётчик. Живёт здесь, а не в `SessionStatus`, только чтобы не
  заводить кольцо импортов: `SessionStatus` и так тянет это меню, значит
  и плашку возьмёт отсюда же.
*/
export function NavBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-ink">
      {children}
    </span>
  );
}

function MenuIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}
