"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
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
      <div className="flex items-center gap-4">
        <Link
          href="/new"
          className="flex h-9 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          Добавить запись
        </Link>
        <Link href={`/u/${data.user.username}`} className={navLinkClassName}>
          Мой дневник
        </Link>
        <Link href="/following" className={navLinkClassName}>
          Моя лента
        </Link>
        <Link href="/friends" className={navLinkClassName}>
          Друзья
          {requestCount > 0 && <Badge>{requestCount}</Badge>}
        </Link>
        <Link href="/messages" className={navLinkClassName}>
          Сообщения
          {unreadMessages > 0 && <Badge>{unreadMessages}</Badge>}
        </Link>

        <div className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-line pl-3 pr-1">
          <Link
            href="/settings"
            title="Настройки профиля"
            className="max-w-[9rem] truncate text-sm font-medium text-ink hover:text-accent"
          >
            {data.user.username}
          </Link>
          <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
          <SignOutButton />
        </div>
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

// Счётчик непрочитанного: раньше это была просто цифра в скобках, теперь
// акцентная точка-плашка — её видно боковым зрением, ради чего счётчик и нужен.
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-ink">
      {children}
    </span>
  );
}
