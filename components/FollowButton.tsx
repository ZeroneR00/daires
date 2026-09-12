"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollow } from "@/app/u/[username]/actions";
import { pillButton } from "@/lib/ui";

interface FollowButtonProps {
  targetUsername: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
}

export function FollowButton({
  targetUsername,
  initialFollowing,
  initialFollowerCount,
}: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { following: initialFollowing, count: initialFollowerCount },
    (state, following: boolean) => ({
      following,
      count: state.count + (following === state.following ? 0 : following ? 1 : -1),
    }),
  );

  function handleClick() {
    const nextFollowing = !optimistic.following;
    startTransition(async () => {
      setOptimistic(nextFollowing);
      await toggleFollow(targetUsername);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      /* Оба состояния — обычная «таблетка»: надпись здесь это действие
         («Подписаться»/«Отписаться»), а не состояние, и заливка акцентом
         читалась бы как совет отписаться. */
      className={pillButton}
    >
      {optimistic.following ? "Отписаться" : "Подписаться"}
    </button>
  );
}
