"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/lib/like-actions";

interface LikeButtonProps {
  postId: string;
  authorUsername: string;
  slug: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({
  postId,
  authorUsername,
  slug,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (state, liked: boolean) => ({
      liked,
      count: state.count + (liked === state.liked ? 0 : liked ? 1 : -1),
    }),
  );

  function handleClick() {
    const nextLiked = !optimistic.liked;
    startTransition(async () => {
      setOptimistic(nextLiked);
      await toggleLike(postId, authorUsername, slug);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-black disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      <span aria-hidden>{optimistic.liked ? "♥" : "♡"}</span>
      {optimistic.count}
    </button>
  );
}
