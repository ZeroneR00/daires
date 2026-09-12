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
const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup";

/*
  Один и тот же формат ответа у `search` и у `lookup` — оба эндпоинта iTunes
  отдают массив `results` с одинаковыми полями. Поэтому и фильтр, и маппер
  общие: чарт нормализуется тем же кодом, что и поиск, и `externalId`
  гарантированно совпадает по форме (`itunes:<trackId>`). Это не косметика —
  на `externalId` завязан upsert трека в базе, разойдись формат, и один и
  тот же трек лёг бы двумя строками.
*/
function isSong(item: ItunesTrackResult): boolean {
  return item.wrapperType === "track" && item.kind === "song";
}

function toNormalizedTrack(item: ItunesTrackResult): NormalizedTrack {
  return {
    externalId: `itunes:${item.trackId}`,
    source: "itunes" as const,
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName ?? null,
    artworkUrl: item.artworkUrl100 ?? null,
    previewUrl: item.previewUrl ?? null,
  };
}

async function fetchJson<T>(url: URL | string, what: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch (cause) {
    throw new TrackSearchError(`Не удалось обратиться к ${what}`, { cause });
  }

  if (!response.ok) {
    throw new TrackSearchError(`${what} вернул ошибку: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function searchTracks(query: string): Promise<NormalizedTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(ITUNES_SEARCH_URL);
  url.searchParams.set("term", trimmed);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "25");

  const data = await fetchJson<ItunesSearchResponse>(url, "iTunes Search API");

  return data.results.filter(isSong).map(toNormalizedTrack);
}

/*
  ── Чарт «сегодня слушают» ──────────────────────────────────────────────

  Заполняет пустой пикер: пока в поле ничего не набрано, показывать нечего,
  а чистый белый прямоугольник читается как поломка. Заодно это самый
  дешёвый способ начать запись — чаще всего пишут как раз про то, что
  сейчас на слуху.

  Живёт отдельным эндпоинтом: у iTunes Search API чартов нет вообще. Чарты
  Apple отдаёт RSS Marketing Tools — и там на трек приходит только id, имя,
  артист и обложка. Ни превью, ни альбома, а без превью строка в пикере
  немая, слушать нечего.

  Отсюда два запроса вместо одного:
    1. RSS-фид — задаёт СОСТАВ и ПОРЯДОК (позиция в чарте — это его смысл);
    2. iTunes lookup — добирает превью и альбом сразу на все 20 id одним
       запросом (проверено: `id` из фида совпадает с `trackId` в lookup,
       поэтому переходник между ними не нужен).

  Порядок после второго шага восстанавливаем руками: lookup возвращает
  треки в своём порядке, а не в порядке переданных id.
*/

interface AppleChartResponse {
  feed?: { results?: { id: string }[] };
}

/*
  Витрина прибита гвоздями, а не вынесена в настройку: дневник русскоязычный,
  и «сегодня слушают» имеет смысл ровно тогда, когда это чарт той же страны,
  что и читатель. Понадобится выбор витрины — это будет разговор про профиль
  пользователя, а не про переменную окружения.
*/
const CHART_STOREFRONT = "ru";
const TOP_TRACKS_LIMIT = 20;

/*
  Кеш процесса, а не `fetch`-кеш Next: чарт запрашивается из Server Action,
  а экшены Next считает мутациями и свой Data Cache в них не применяет.
  Час здесь — не про свежесть (фид обновляется раз в сутки), а про лимит
  iTunes: ~20 запросов в минуту на IP, а пикер открывают куда чаще.

  Цена честная: кеш живёт в памяти инстанса и умирает вместе с ним, так что
  на нескольких инстансах их будет несколько. Для чарта это безразлично —
  данные публичные и одинаковые для всех.
*/
const TOP_TRACKS_TTL_MS = 60 * 60 * 1000;
let topTracksCache: { tracks: NormalizedTrack[]; expiresAt: number } | null = null;

export async function getTopTracks(): Promise<NormalizedTrack[]> {
  if (topTracksCache && topTracksCache.expiresAt > Date.now()) {
    return topTracksCache.tracks;
  }

  const chart = await fetchJson<AppleChartResponse>(
    `https://rss.marketingtools.apple.com/api/v2/${CHART_STOREFRONT}/music/most-played/${TOP_TRACKS_LIMIT}/songs.json`,
    "Apple RSS",
  );

  const chartIds = chart.feed?.results?.map((item) => item.id) ?? [];
  if (chartIds.length === 0) return [];

  const lookupUrl = new URL(ITUNES_LOOKUP_URL);
  lookupUrl.searchParams.set("id", chartIds.join(","));
  lookupUrl.searchParams.set("country", CHART_STOREFRONT);
  lookupUrl.searchParams.set("entity", "song");

  const lookup = await fetchJson<ItunesSearchResponse>(lookupUrl, "iTunes Lookup API");

  const byId = new Map(
    lookup.results
      .filter(isSong)
      .map((item) => [String(item.trackId), toNormalizedTrack(item)]),
  );

  // Ведущий здесь фид, а не lookup: он знает порядок. Трек, которого lookup
  // не отдал (снят с продажи, региональные права), просто выпадает из списка,
  // а не рвёт весь чарт.
  const tracks = chartIds
    .map((id) => byId.get(id))
    .filter((track): track is NormalizedTrack => track !== undefined);

  topTracksCache = { tracks, expiresAt: Date.now() + TOP_TRACKS_TTL_MS };
  return tracks;
}
