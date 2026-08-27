"use client";

import Link from "next/link";
import { usePreviewPlayer } from "@/components/PreviewPlayer";

interface TrackArtworkProps {
  trackId: string;
  artworkUrl: string | null;
  previewUrl: string | null;
  title: string;
  artist: string;
  href?: string;
  size?: number;
}

/*
  Обложка как пластинка в конверте: сам винил лежит позади и выезжает вправо
  на ховере, а во время проигрывания крутится. Play-кнопка — сестра ссылки, а
  не потомок: <button> внутри <a> невалиден (та же грабля, что в
  IncomingRequestRow), поэтому кнопка позиционируется поверх абсолютом.

  Свечение — это та же обложка, размытая до неузнаваемости. Так лента получает
  цвет от самой музыки, и не нужно ни считать доминирующий цвет на сервере, ни
  тащить картинку в canvas (обложки iTunes отдаются без CORS-заголовков, canvas
  бы их всё равно не прочитал).
*/
export function TrackArtwork({
  trackId,
  artworkUrl,
  previewUrl,
  title,
  artist,
  href,
  size = 112,
}: TrackArtworkProps) {
  const { playingId, toggle } = usePreviewPlayer();
  const isPlaying = playingId === trackId;

  if (!artworkUrl) return null;

  const cover = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={artworkUrl}
      alt={`${artist} — ${title}`}
      width={size}
      height={size}
      className="relative z-10 block rounded-xl object-cover shadow-[0_10px_30px_-12px_rgba(28,25,23,.55)] ring-1 ring-line"
      style={{ width: size, height: size }}
    />
  );

  return (
    /* Ширина с запасом справа: там лежит пластинка, и место под неё
       зарезервировано в потоке — иначе на ховере она наезжала бы на текст. */
    <div
      className="group/art relative shrink-0"
      style={{ width: Math.round(size * 1.34), height: size }}
    >
      <span
        aria-hidden
        style={{ backgroundImage: `url(${artworkUrl})` }}
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-cover bg-center opacity-0 blur-2xl saturate-[1.8] transition-opacity duration-500 group-hover/art:opacity-70 data-[on=true]:opacity-80"
        data-on={isPlaying}
      />

      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 z-0 aspect-square transition-transform duration-500 ease-out group-hover/art:translate-x-[34%] ${
          isPlaying ? "translate-x-[34%]" : ""
        }`}
      >
        <span
          className={`vinyl block h-full w-full rounded-full ${
            isPlaying ? "vinyl--spinning" : ""
          }`}
        />
      </span>

      {href ? <Link href={href}>{cover}</Link> : cover}

      {previewUrl && (
        <button
          type="button"
          onClick={() => toggle(trackId, previewUrl)}
          aria-label={isPlaying ? "Остановить превью" : "Послушать превью"}
          className={`absolute bottom-2 left-2 z-20 grid h-9 w-9 place-items-center rounded-full bg-ink/70 text-paper backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover/art:opacity-100 ${
            isPlaying ? "sm:opacity-100" : ""
          }`}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M3.5 1.8v10.4a.6.6 0 0 0 .93.5l8-5.2a.6.6 0 0 0 0-1l-8-5.2a.6.6 0 0 0-.93.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <rect x="3" y="2" width="3" height="10" rx="1" />
      <rect x="8" y="2" width="3" height="10" rx="1" />
    </svg>
  );
}
