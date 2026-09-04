"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { cancelFriendRequest } from "@/lib/friend-actions";
import { pillButton } from "@/lib/ui";

interface OutgoingRequestRowProps {
  target: { username: string; name: string; avatarUrl: string | null };
}

export function OutgoingRequestRow({ target }: OutgoingRequestRowProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3">
      <Link
        href={`/u/${target.username}`}
        className="group flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar url={target.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink transition-colors group-hover:text-accent">
            {target.name}
          </p>
          <p className="truncate text-xs text-muted">@{target.username}</p>
        </div>
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => { await cancelFriendRequest(target.username); })}
        className={pillButton}
      >
        Отменить
      </button>
    </div>
  );
}
