import type { ProfileStats as ProfileStatsData } from "@/lib/stats";

interface ProfileStatsProps {
  stats: ProfileStatsData;
  memberSince: string;
}

/*
  Колофон дневника, а не дашборд: раньше это была вторая карточка подряд с
  тремя крупными цифрами в сетке — на странице, где карточки принадлежат
  записям, такой блок читался как виджет статистики. Теперь цифры лежат прямо
  на бумаге, набраны антиквой и держатся строкой; коробки у них нет.

  Подписи в форме "Записей: 3", а не "3 записи" — русская плюрализация
  существительных требует трёх ветвей (1/2-4/5+), а числу-счётчику
  согласование не нужно вообще. Отсюда и порядок «подпись сверху, число
  снизу»: в обратном порядке блок читался бы как "12 Записей" и требовал бы
  той самой плюрализации.
*/
export function ProfileStats({ stats, memberSince }: ProfileStatsProps) {
  const tiles = [
    { label: "Записей", value: stats.postCount },
    { label: "Лайков собрано", value: stats.likesReceived },
    { label: "Треков залогировано", value: stats.uniqueTrackCount },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted">{tile.label}</span>
            <span className="font-serif text-2xl leading-none text-ink">
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted">
        <p>Ведёт дневник с {memberSince}</p>

        {stats.topArtists.length > 0 && (
          <p>
            Чаще всего звучат:{" "}
            {stats.topArtists.map((entry, index) => (
              <span key={entry.artist}>
                {index > 0 && ", "}
                <span className="text-ink">{entry.artist}</span> ({entry.count})
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
