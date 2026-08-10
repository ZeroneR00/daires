"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollow } from "@/app/u/[username]/actions";

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
      className="flex h-9 items-center rounded-full border border-black/[.08] px-4 text-sm font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
    >
      {optimistic.following ? "Отписаться" : "Подписаться"}
    </button>
  );
}
