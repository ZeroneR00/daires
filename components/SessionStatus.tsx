"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
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

export function SessionStatus() {
  const mounted = useMounted();
  const { data, isPending } = authClient.useSession();

  if (!mounted || isPending) {
    return null;
  }

  if (data) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/new"
          className="flex h-9 items-center rounded-full border border-black/[.08] px-4 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
        >
          Добавить запись
        </Link>
        <Link
          href="/settings"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          {data.user.username}
        </Link>
        <Link
          href={`/u/${data.user.username}`}
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          Мой дневник
        </Link>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm font-medium">
      <Link href="/login" className="text-black dark:text-zinc-50">
        Войти
      </Link>
      <Link
        href="/signup"
        className="flex h-9 items-center rounded-full bg-foreground px-4 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Регистрация
      </Link>
    </div>
  );
}
