import { prisma } from "@/lib/prisma";
import { getPostsByIds, type PostWithDetails } from "@/lib/posts";

const SEARCH_RESULT_LIMIT = 10;

// Prisma не гарантирует порядок для `where: { id: { in: ids } }`, а ранжирование
// по релевантности живёт именно в порядке `ids` — восстанавливаем его вручную.
function reorderByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

// `websearch_to_tsquery`, а не `to_tsquery`: не падает на произвольном
// пользовательском вводе (кавычки, дефисы, одиночные операторы).
export async function searchPosts(query: string): Promise<PostWithDetails[]> {
  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "post"
    WHERE to_tsvector('russian', "text") @@ websearch_to_tsquery('russian', ${query})
    ORDER BY ts_rank(
      to_tsvector('russian', "text"),
      websearch_to_tsquery('russian', ${query})
    ) DESC
    LIMIT ${SEARCH_RESULT_LIMIT}
  `;
  if (ranked.length === 0) return [];

  const ids = ranked.map((row) => row.id);
  return reorderByIds(await getPostsByIds(ids), ids);
}

export async function searchTracks(query: string) {
  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "track"
    WHERE to_tsvector('simple', "title" || ' ' || "artist")
      @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(
      to_tsvector('simple', "title" || ' ' || "artist"),
      websearch_to_tsquery('simple', ${query})
    ) DESC
    LIMIT ${SEARCH_RESULT_LIMIT}
  `;
  if (ranked.length === 0) return [];

  const ids = ranked.map((row) => row.id);
  const tracks = await prisma.track.findMany({ where: { id: { in: ids } } });
  return reorderByIds(tracks, ids);
}

export async function searchUsers(query: string) {
  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "user"
    WHERE to_tsvector('simple', "username" || ' ' || "name")
      @@ websearch_to_tsquery('simple', ${query})
    ORDER BY ts_rank(
      to_tsvector('simple', "username" || ' ' || "name"),
      websearch_to_tsquery('simple', ${query})
    ) DESC
    LIMIT ${SEARCH_RESULT_LIMIT}
  `;
  if (ranked.length === 0) return [];

  const ids = ranked.map((row) => row.id);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, name: true, avatarUrl: true },
  });
  return reorderByIds(users, ids);
}
