"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
import { MobileMenu, NavBadge } from "./MobileMenu";
import { useNotifications } from "./NotificationsProvider";
import { SignOutButton } from "./SignOutButton";

function subscribeNoop() {
  return () => {};
}

function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

const navLinkClassName =
  "text-sm text-muted transition-colors hover:text-accent";

export function SessionStatus() {
  const mounted = useMounted();
  const { data, isPending } = authClient.useSession();
  const { friendRequests, unreadMessages } = useNotifications();
  const requestCount = friendRequests?.count ?? 0;

  if (!mounted || isPending) {
    return null;
  }

  if (data) {
    return (
      <div className="flex items-center gap-3 sm:gap-4">
        {/*
          Главное действие сайта — единственное, что не уезжает в меню на
          узком экране; полный текст съедал бы там ~150 px, поэтому у него
          короткая форма.
        */}
        <Link
          href="/new"
          className="flex h-9 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          <span className="sm:hidden">Записать</span>
          <span className="hidden sm:inline">Добавить запись</span>
        </Link>

        {/*
          Ряд разделов — только с lg и выше; ниже его заменяет MobileMenu.
          Порог именно lg, а не sm: полному ряду (четыре раздела + имя +
          «Выйти» + «Добавить запись» + знак + лупа + тема) нужно ~936 px,
          и на 640–1023 он растягивал документ шире вьюпорта — страница
          ехала вбок ровно так же, как когда-то на 390.
        */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link href={`/u/${data.user.username}`} className={navLinkClassName}>
            Мой дневник
          </Link>
          <Link href="/following" className={navLinkClassName}>
            Моя лента
          </Link>
          <Link href="/friends" className={navLinkClassName}>
            Друзья
            {requestCount > 0 && <NavBadge>{requestCount}</NavBadge>}
          </Link>
          <Link href="/messages" className={navLinkClassName}>
            Сообщения
            {unreadMessages > 0 && <NavBadge>{unreadMessages}</NavBadge>}
          </Link>

          <div className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-line pl-3 pr-1">
            <Link
              href="/settings"
              title="Настройки профиля"
              /* На 1024 ряд стоит впритык: имя во всю прежнюю ширину
                 вылезало за вьюпорт на 11 px (замерено). Полные 9rem
                 возвращаются с xl, где место есть. */
              className="max-w-28 truncate text-sm font-medium text-ink hover:text-accent xl:max-w-36"
            >
              {data.user.username}
            </Link>
            <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
            <SignOutButton />
          </div>
        </div>

        <MobileMenu
          username={data.user.username}
          requestCount={requestCount}
          unreadMessages={unreadMessages}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm font-medium">
      <Link href="/login" className="text-ink transition-colors hover:text-accent">
        Войти
      </Link>
      <Link
        href="/signup"
        className="flex h-9 items-center rounded-full bg-accent px-4 text-accent-ink transition-opacity hover:opacity-90"
      >
        Регистрация
      </Link>
    </div>
  );
}
