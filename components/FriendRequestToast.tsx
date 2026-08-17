"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFriendRequests } from "@/components/FriendRequestsProvider";
import type { FriendRequestNotice } from "@/lib/notifications";

const AUTO_HIDE_MS = 12_000;

// Чисто презентационный: когда напомнить — решает FriendRequestsProvider, тут
// остаётся показать очередное напоминание и дать его закрыть. "Закрыт" хранится
// как сам объект напоминания, а не boolean: следующее напоминание — новый
// объект, оно не окажется закрытым по инерции.
export function FriendRequestToast() {
  const { announcement } = useFriendRequests();
  const [dismissed, setDismissed] = useState<FriendRequestNotice | null>(null);
  const visible = announcement !== null && announcement !== dismissed;

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = window.setTimeout(() => setDismissed(announcement), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [visible, announcement]);

  if (!announcement || !visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-black/[.08] bg-background px-4 py-3 text-sm shadow-lg dark:border-white/[.145]"
    >
      <span className="text-zinc-700 dark:text-zinc-300">
        {announcement.count === 1
          ? `Заявка в друзья от @${announcement.latestUsername}`
          : `Заявки в друзья: ${announcement.count}`}
      </span>
      <Link
        href="/friends"
        onClick={() => setDismissed(announcement)}
        className="font-medium text-black hover:underline dark:text-zinc-50"
      >
        Посмотреть
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(announcement)}
        aria-label="Закрыть"
        className="text-zinc-500 transition-colors hover:text-black dark:hover:text-zinc-50"
      >
        ✕
      </button>
    </div>
  );
}
