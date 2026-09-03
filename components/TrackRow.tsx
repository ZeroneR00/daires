"use client";

import { useEffect, useRef } from "react";
import { artworkAtSize } from "@/lib/artwork";
import { usePreviewPlayer } from "@/components/PreviewPlayer";
import type { QueueTrack } from "@/lib/track-queue";

interface TrackRowTrack {
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
}

interface TrackRowProps {
  track: TrackRowTrack;
  /*
    Идентификатор для плеера. Своего поля у `TrackRowTrack` нет намеренно:
    в поиске это `Track.id` из нашей базы, а в пикере — `externalId` от
    iTunes, у трека там ещё нет строки в базе. Обе стороны знают свой id
    сами, компоненту достаточно, чтобы он был уникален на странице.
  */
  trackId?: string;
  /** Номер дорожки в записи. Нет — строка живёт вне записи (поиск, пикер). */
  index?: number;
  /*
    Очередь записи целиком: клик по строке запускает не её одну, а альбом
    с этого места. В поиске и пикере очереди нет — там ищут, а не слушают
    подряд, и клик остаётся одиночным `toggle`.
  */
  queue?: QueueTrack[];
  queueIndex?: number;
}

/*
  Строка стала клиентской ради одного — общего плеера. Раньше здесь стоял
  нативный <audio controls>: серая панель Chrome со своим ползунком и
  громкостью, единственный кусок браузерного хрома в дизайне. Хуже того,
  она была вторым, независимым способом слушать: обложка в карточке ходит
  через `usePreviewPlayer`, строка — сама по себе, и два превью могли
  заиграть хором.

  Что потеряли осознанно: перемотку и регулятор громкости, которые нативный
  элемент давал даром. Превью длится 30 секунд — перематывать в нём нечего.
*/
export function TrackRow({
  track,
  trackId,
  index,
  queue,
  queueIndex,
}: TrackRowProps) {
  const artwork = artworkAtSize(track.artworkUrl, 200);
  const { playingId, toggle, playQueue, subscribeProgress } = usePreviewPlayer();
  const isPlaying = trackId !== undefined && playingId === trackId;
  const canPlay = track.previewUrl !== null && trackId !== undefined;
  const progressRef = useRef<HTMLSpanElement | null>(null);

  /*
    Подписан только тот, кто сейчас звучит: провайдер шлёт долю проигранного
    по timeupdate, и обновлять её через setState значило бы перерисовывать
    строку четыре раза в секунду. Пишем CSS-переменную напрямую в узел.
  */
  useEffect(() => {
    if (!isPlaying) return;
    progressRef.current?.style.setProperty("--p", "0");
    return subscribeProgress((ratio) => {
      progressRef.current?.style.setProperty("--p", String(ratio));
    });
  }, [isPlaying, subscribeProgress]);

  const handlePlay = () => {
    if (!canPlay) return;
    if (queue && queueIndex !== undefined && queueIndex >= 0) {
      playQueue(queue, queueIndex);
      return;
    }
    toggle(trackId, track.previewUrl!);
  };

  return (
    <div
      className={`relative flex items-center gap-3 overflow-hidden rounded-xl border p-2.5 transition-colors ${
        isPlaying
          ? "border-accent/25 bg-accent-wash"
          : "border-line bg-paper"
      }`}
    >
      {index !== undefined && (
        <span
          aria-hidden
          className="w-4 shrink-0 text-center font-serif text-xs text-muted"
        >
          {index}
        </span>
      )}

      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork}
          alt=""
          className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-line"
        />
      ) : (
        <div className="h-11 w-11 shrink-0 rounded-lg bg-accent-wash ring-1 ring-line" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{track.title}</p>
        <p className="truncate text-xs text-muted">
          {track.artist}
          {track.album ? ` — ${track.album}` : ""}
        </p>
      </div>

      {/*
        Заливка акцентом — только пока звучит: это состояние, а не действие,
        ровно то различие, ради которого в lib/ui.ts разведены pillButton
        и pillButtonActive. Трек без превью кнопку не прячет, а гасит: молча
        исчезнувшая кнопка выглядит сломанной вёрсткой, а не «нечего играть».
      */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={!canPlay}
        title={canPlay ? undefined : "Превью недоступно"}
        aria-label={
          canPlay
            ? isPlaying
              ? "Остановить превью"
              : "Послушать превью"
            : "Превью недоступно"
        }
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors ${
          isPlaying
            ? "border-accent bg-accent text-accent-ink"
            : "border-line text-muted enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-40"
        }`}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {isPlaying && (
        <span
          aria-hidden
          ref={progressRef}
          className="track-progress absolute inset-x-0 bottom-0 h-0.5 bg-accent"
        />
      )}
    </div>
  );
}

// Свои копии глифов, а не импорт из TrackArtwork: там они тоже локальные,
// и делать один компонент владельцем иконок другого — связь на ровном месте.
function PlayIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden
    >
      <path d="M3.5 1.8v10.4a.6.6 0 0 0 .93.5l8-5.2a.6.6 0 0 0 0-1l-8-5.2a.6.6 0 0 0-.93.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden
    >
      <rect x="3" y="2" width="3" height="10" rx="1" />
      <rect x="8" y="2" width="3" height="10" rx="1" />
    </svg>
  );
}
