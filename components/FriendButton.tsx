"use client";

import { useOptimistic, useTransition } from "react";
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "@/lib/friend-actions";
import type { FriendshipStatus } from "@/lib/friends";
import { useFriendRequests } from "@/components/FriendRequestsProvider";

interface FriendButtonProps {
  targetUsername: string;
  initialStatus: FriendshipStatus;
}

const buttonClass =
  "flex h-9 items-center rounded-full border border-black/[.08] px-4 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]";

export function FriendButton({ targetUsername, initialStatus }: FriendButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { refresh } = useFriendRequests();
  const [status, setStatus] = useOptimistic(
    initialStatus,
    (_state, next: FriendshipStatus) => next,
  );

  function run(next: FriendshipStatus, action: () => Promise<unknown>) {
    startTransition(async () => {
      setStatus(next);
      await action();
      // Принял/отклонил входящую — счётчик в шапке должен упасть сразу.
      // Отправка своей заявки чужой счётчик меняет, а мой нет, но лишний
      // перечит дешевле, чем разбор какое действие на что влияет.
      refresh();
    });
  }

  if (status === "friends") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => run("none", () => removeFriend(targetUsername))}
        className={buttonClass}
      >
        Друзья
      </button>
    );
  }

  if (status === "pending_outgoing") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => run("none", () => cancelFriendRequest(targetUsername))}
        className={buttonClass}
      >
        Заявка отправлена
      </button>
    );
  }

  if (status === "pending_incoming") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("friends", () => acceptFriendRequest(targetUsername))}
          className={buttonClass}
        >
          Принять
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("none", () => declineFriendRequest(targetUsername))}
          className={buttonClass}
        >
          Отклонить
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => run("pending_outgoing", () => sendFriendRequest(targetUsername))}
      className={buttonClass}
    >
      Добавить в друзья
    </button>
  );
}
