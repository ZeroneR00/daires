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
      className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60 ${
        optimistic.liked ? "text-accent" : "text-muted hover:text-accent"
      }`}
    >
      <span aria-hidden className="text-base leading-none">
        {optimistic.liked ? "♥" : "♡"}
      </span>
      {optimistic.count}
    </button>
  );
}
