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
import { pillButton, pillButtonPrimary } from "@/lib/ui";

interface IncomingRequestRowProps {
  requester: { username: string; name: string; avatarUrl: string | null };
  // Строка из секции "Отложенные": кнопка "Позже" тут бессмысленна, остальные
  // две работают как обычно — отложенную заявку можно принять или отклонить.
  deferred?: boolean;
}

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
    // flex-wrap + basis-full: на узком экране кнопки уезжают на свою строку,
    // а не сдавливают имя в пару символов. Ховер — только на имени: строка
    // целиком не ссылка, подсвечивать её всю значило бы врать про клик.
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3">
      <Link
        href={`/u/${requester.username}`}
        className="group flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto"
      >
        <Avatar url={requester.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink transition-colors group-hover:text-accent">
            {requester.name}
          </p>
          <p className="truncate text-xs text-muted">@{requester.username}</p>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => acceptFriendRequest(requester.username))}
          className={pillButtonPrimary}
        >
          Принять
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => declineFriendRequest(requester.username))}
          className={pillButton}
        >
          Отклонить
        </button>
        {!deferred && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => ignoreFriendRequest(requester.username))}
            title="Заявка останется, но перестанет напоминать о себе"
            className={pillButton}
          >
            Позже
          </button>
        )}
      </div>
    </div>
  );
}
