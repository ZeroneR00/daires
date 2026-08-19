"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import {
  acceptFriendRequest,
  declineFriendRequest,
  ignoreFriendRequest,
} from "@/lib/friend-actions";
import { useNotifications } from "@/components/NotificationsProvider";

interface IncomingRequestRowProps {
  requester: { username: string; name: string; avatarUrl: string | null };
  // Строка из секции "Отложенные": кнопка "Позже" тут бессмысленна, остальные
  // две работают как обычно — отложенную заявку можно принять или отклонить.
  deferred?: boolean;
}

const buttonClass =
  "flex h-8 items-center rounded-full border border-black/[.08] px-3 text-xs font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]";

export function IncomingRequestRow({ requester, deferred = false }: IncomingRequestRowProps) {
  const [isPending, startTransition] = useTransition();
  const { refresh } = useNotifications();

  // revalidatePath внутри экшена перерисует серверную страницу, но не клиентскую
  // шапку — цифру рядом с "Друзья" обновляем сами, после того как экшен ответил.
  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]">
      <Link href={`/u/${requester.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar url={requester.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
            {requester.name}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            @{requester.username}
          </p>
        </div>
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => acceptFriendRequest(requester.username))}
        className={buttonClass}
      >
        Принять
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => declineFriendRequest(requester.username))}
        className={buttonClass}
      >
        Отклонить
      </button>
      {!deferred && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => ignoreFriendRequest(requester.username))}
          title="Заявка останется, но перестанет напоминать о себе"
          className={buttonClass}
        >
          Позже
        </button>
      )}
    </div>
  );
}
