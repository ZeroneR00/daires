export type TrackSource = "itunes" | "musicbrainz";

export interface NormalizedTrack {
  externalId: string;
  source: TrackSource;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  previewUrl: string | null;
}

export class TrackSearchError extends Error {}

interface ItunesTrackResult {
  wrapperType: string;
  kind?: string;
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
}

interface ItunesSearchResponse {
  results: ItunesTrackResult[];
}

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

export async function searchTracks(query: string): Promise<NormalizedTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(ITUNES_SEARCH_URL);
  url.searchParams.set("term", trimmed);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "25");

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch (cause) {
    throw new TrackSearchError("Не удалось обратиться к iTunes Search API", { cause });
  }

  if (!response.ok) {
    throw new TrackSearchError(`iTunes Search API вернул ошибку: ${response.status}`);
  }

  const data = (await response.json()) as ItunesSearchResponse;

  return data.results
    .filter((item) => item.wrapperType === "track" && item.kind === "song")
    .map((item) => ({
      externalId: `itunes:${item.trackId}`,
      source: "itunes" as const,
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName ?? null,
      artworkUrl: item.artworkUrl100 ?? null,
      previewUrl: item.previewUrl ?? null,
    }));
}
