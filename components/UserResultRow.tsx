import Link from "next/link";
import { Avatar } from "@/components/Avatar";

// Свой минимальный тип пропов, а не импорт модели Prisma (как в `TrackRow`):
// компоненту нужны три поля, откуда пришёл объект — не его дело.
interface UserResultRowUser {
  username: string;
  name: string;
  avatarUrl: string | null;
}

interface UserResultRowProps {
  user: UserResultRowUser;
}

export function UserResultRow({ user }: UserResultRowProps) {
  return (
    <Link
      href={`/u/${user.username}`}
      className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 transition-colors hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.06]"
    >
      <Avatar url={user.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
          {user.name}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          @{user.username}
        </p>
      </div>
    </Link>
  );
}
