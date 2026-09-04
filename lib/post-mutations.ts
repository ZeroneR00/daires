import type { Prisma } from "@/generated/prisma/client";
import type { PostInput } from "@/lib/post-schema";

type TrackInput = PostInput["tracks"][number];

/*
  Раньше здесь стоял цикл: upsert трека + create связи, то есть два круговых
  похода в базу на каждый трек записи. На потолке в MAX_TRACKS_PER_POST (20)
  это 40 запросов подряд внутри одной транзакции — при RTT до Supabase через
  pooler ~100 мс почти четыре секунды с висящим соединением, занятым из пула.

  Теперь три запроса независимо от количества треков:
  1) createMany новых треков (skipDuplicates — уже известные молча пропускаются);
  2) findMany их id по externalId;
  3) createMany связей PostTrack с исходным порядком.

  Что теряется осознанно: раньше upsert заодно освежал метаданные уже
  известного трека (title/artist/artworkUrl) свежими данными из iTunes,
  skipDuplicates этого не делает. Название песни не меняется — потеря
  невелика; понадобится обновление, оно делается отдельным updateMany вне
  этого горячего пути.
*/
export async function attachTracksToPost(
  tx: Prisma.TransactionClient,
  postId: string,
  tracks: TrackInput[],
): Promise<void> {
  if (tracks.length === 0) return;

  await tx.track.createMany({
    data: tracks.map((track) => ({
      externalId: track.externalId,
      source: track.source,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artworkUrl: track.artworkUrl,
      previewUrl: track.previewUrl,
    })),
    skipDuplicates: true,
  });

  const externalIds = tracks.map((track) => track.externalId);
  const savedTracks = await tx.track.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true, externalId: true },
  });
  const idByExternalId = new Map(
    savedTracks.map((track) => [track.externalId, track.id]),
  );

  /*
    Порядок треков берётся из входного массива, а не из результата findMany:
    он порядок не гарантирует (та же грабля, что у reorderByIds в lib/search.ts).
  */
  await tx.postTrack.createMany({
    data: tracks.map((track, position) => ({
      postId,
      trackId: idByExternalId.get(track.externalId)!,
      position,
    })),
  });
}
