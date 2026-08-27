import { artworkAtSize } from "@/lib/artwork";

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
  const artwork = artworkAtSize(track.artworkUrl, 200);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-2.5">
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
        {showPreview && track.previewUrl && (
          <audio
            controls
            preload="none"
            src={track.previewUrl}
            className="mt-2 h-8 w-full"
          />
        )}
      </div>
    </div>
  );
}
