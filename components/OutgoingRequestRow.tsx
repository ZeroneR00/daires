"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { cancelFriendRequest } from "@/lib/friend-actions";

interface OutgoingRequestRowProps {
  target: { username: string; name: string; avatarUrl: string | null };
}

export function OutgoingRequestRow({ target }: OutgoingRequestRowProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]">
      <Link href={`/u/${target.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar url={target.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
            {target.name}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            @{target.username}
          </p>
        </div>
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => { await cancelFriendRequest(target.username); })}
        className="flex h-8 items-center rounded-full border border-black/[.08] px-3 text-xs font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
      >
        Отменить
      </button>
    </div>
  );
}
