import type { ProfileStats as ProfileStatsData } from "@/lib/stats";

interface ProfileStatsProps {
  stats: ProfileStatsData;
  memberSince: string;
}

// Подписи в форме "Записей: 3", а не "3 записи" — русская плюрализация
// существительных требует трёх ветвей (1/2-4/5+), а числу-счётчику
// согласование не нужно вообще.
export function ProfileStats({ stats, memberSince }: ProfileStatsProps) {
  const tiles = [
    { label: "Записей", value: stats.postCount },
    { label: "Лайков собрано", value: stats.likesReceived },
    { label: "Треков залогировано", value: stats.uniqueTrackCount },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <div className="grid grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col">
            <span className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
              {tile.value}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {tile.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Ведёт дневник с {memberSince}
      </p>

      {stats.topArtists.length > 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Топ артистов:{" "}
          {stats.topArtists
            .map((entry) => `${entry.artist} (${entry.count})`)
            .join(", ")}
        </p>
      )}
    </div>
  );
}
