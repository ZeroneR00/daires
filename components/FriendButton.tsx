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
import { useNotifications } from "@/components/NotificationsProvider";
import { pillButton, pillButtonActive, pillButtonPrimary } from "@/lib/ui";

interface FriendButtonProps {
  targetUsername: string;
  initialStatus: FriendshipStatus;
}

export function FriendButton({ targetUsername, initialStatus }: FriendButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { refresh } = useNotifications();
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

  // «Друзья» и «Заявка отправлена» — надписи-состояния, поэтому лёгкая
  // заливка акцентом: связь уже есть. У остальных надпись это действие.
  if (status === "friends") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => run("none", () => removeFriend(targetUsername))}
        className={pillButtonActive}
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
        className={pillButtonActive}
      >
        Заявка отправлена
      </button>
    );
  }

  if (status === "pending_incoming") {
    return (
      <div className="flex items-center gap-2">
        {/* Из двух кнопок акцентом залита одна: принять — то, ради чего
            заявку показывают, отклонить — запасной выход */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("friends", () => acceptFriendRequest(targetUsername))}
          className={pillButtonPrimary}
        >
          Принять
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("none", () => declineFriendRequest(targetUsername))}
          className={pillButton}
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
      className={pillButton}
    >
      Добавить в друзья
    </button>
  );
}
