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
    // Ховер тот же, что у карточки записи: рамка теплеет до акцента, заливка
    // не меняется — строк в списке много, и мигающий фон был бы шумом
    <Link
      href={`/u/${user.username}`}
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-accent/40"
    >
      <Avatar url={user.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">@{user.username}</p>
      </div>
    </Link>
  );
}
