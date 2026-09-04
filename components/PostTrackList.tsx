"use client";

import { useState } from "react";
import { TrackRow } from "@/components/TrackRow";
import { plural } from "@/lib/plural";
import { VISIBLE_TRACKS, type QueueTrack } from "@/lib/track-queue";

/*
  Свой минимальный тип вместо импорта модели Prisma — тот же приём, что у
  пропов UserResultRow: списку нужны шесть полей, а не вся связка PostTrack.
*/
interface ListTrack {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
}

interface PostTrackListProps {
  /** Все дорожки записи по порядку, включая первую (она же на обложке). */
  tracks: ListTrack[];
  /** Очередь всей записи, включая героя, — по ней играет любая строка. */
  queue: QueueTrack[];
  heading?: string;
}

const VISIBLE_ROWS = VISIBLE_TRACKS;
/* Больше двух краёв стопка не показывает: это конверты, а не веер. */
const MAX_SHEETS = 2;

/*
  Владелец списка: сколько показать, что спрятать, как раскрыть. Сворачивание —
  свойство *списка*, а не отдельной строки, по тому же доводу, по которому
  чередование знака решает app/page.tsx, а не PostCard.

  Клиентский остров внутри серверных PostCard и страницы записи — так же там
  уже живут TrackRow и LikeButton.
*/
export function PostTrackList({ tracks, queue, heading }: PostTrackListProps) {
  const [expanded, setExpanded] = useState(false);

  /*
    Одна дорожка — список не нужен: он повторил бы обложку строка в строку,
    и запустить с неё нечего, чего не запускала бы кнопка на самой обложке.
  */
  if (tracks.length < 2) return null;

  const visible = tracks.slice(0, VISIBLE_ROWS);
  const hidden = tracks.slice(VISIBLE_ROWS);
  const sheets = Math.min(hidden.length, MAX_SHEETS);

  /*
    Индекс в очереди ≠ индекс в списке: очередь не берёт треки без превью.
    Поэтому позицию ищем по id, а не считаем по порядку.
  */
  const renderRow = (track: ListTrack, listIndex: number) => (
    <TrackRow
      key={track.id}
      track={track}
      trackId={track.id}
      index={listIndex + 1}
      queue={queue}
      queueIndex={queue.findIndex((item) => item.id === track.id)}
    />
  );

  return (
    <div className="flex flex-col gap-2">
      {heading && (
        <p className="text-xs uppercase tracking-wide text-muted">{heading}</p>
      )}

      {visible.map((track, index) => renderRow(track, index))}

      {hidden.length > 0 && (
        /* Скрытая часть и переключатель — один флекс-ребёнок: иначе свёрнутый
           блок нулевой высоты всё равно съедал бы зазор с обеих сторон. */
        <div>
          {/*
            Раскрытие через grid-template-rows: 0fr → 1fr — чистый CSS, без
            замера высоты в JS. Внутренний overflow-hidden обязателен: без
            него содержимое торчало бы из нулевой строки.
          */}
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2 pb-2">
                {hidden.map((track, index) =>
                  renderRow(track, VISIBLE_ROWS + index),
                )}
              </div>
            </div>
          </div>

          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mx-auto block text-xs text-muted transition-colors hover:text-accent"
            >
              Свернуть
            </button>
          ) : (
            /*
              Стопка конвертов: из-под последней видимой строки выглядывают края
              спрятанных, поверх — счётчик. Полосок ровно столько, сколько
              скрытых строк, но не больше двух: при одном скрытом треке стопка
              из двух листов врала бы.
            */
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              className="group flex w-full flex-col items-center"
            >
              {Array.from({ length: sheets }, (_, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="h-1.5 rounded-b-xl border border-t-0 border-line bg-paper transition-colors group-hover:border-accent/40"
                  style={{ width: `${94 - index * 4}%` }}
                />
              ))}
              <span className="mt-1.5 rounded-full border border-line bg-surface px-3 py-0.5 text-xs text-muted transition-colors group-hover:border-accent/40 group-hover:text-accent">
                ещё {hidden.length}{" "}
                {plural(hidden.length, "дорожка", "дорожки", "дорожек")}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
