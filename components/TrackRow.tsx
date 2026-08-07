interface TrackRowTrack {
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
}

interface TrackRowProps {
  track: TrackRowTrack;
  showPreview?: boolean;
}

export function TrackRow({ track, showPreview = true }: TrackRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]">
      {track.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.artworkUrl} alt="" className="h-10 w-10 shrink-0 rounded" />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
          {track.title}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {track.artist}
          {track.album ? ` — ${track.album}` : ""}
        </p>
        {showPreview && track.previewUrl && (
          <audio
            controls
            preload="none"
            src={track.previewUrl}
            className="mt-1 h-8 w-full"
          />
        )}
      </div>
    </div>
  );
}
