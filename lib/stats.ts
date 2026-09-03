import { prisma } from "@/lib/prisma";

export interface ProfileStats {
  postCount: number;
  likesReceived: number;
  uniqueTrackCount: number;
  topArtists: { artist: string; count: number }[];
}

const TOP_ARTISTS_LIMIT = 3;

export interface SiteStats {
  postCount: number;
  authorCount: number;
}

// Счётчик на первом экране («Уже N записей от M авторов»). Живёт здесь, а не
// в lib/posts.ts: там query-слой ленты, а это счётная логика — рядом с
// getProfileStats. Два COUNT параллельно, уходят в тот же Promise.all, что и
// сессия с лентой в app/page.tsx — страница не медленнее.
// Авторы = пользователи хотя бы с одной записью, а не все зарегистрированные:
// подпись обещает именно авторов.
export async function getSiteStats(): Promise<SiteStats> {
  const [postCount, authorCount] = await Promise.all([
    prisma.post.count(),
    prisma.user.count({ where: { posts: { some: {} } } }),
  ]);

  return { postCount, authorCount };
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [postCount, likesReceived, postTracks] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.like.count({ where: { post: { authorId: userId } } }),
    prisma.postTrack.findMany({
      where: { post: { authorId: userId } },
      select: { trackId: true, track: { select: { artist: true } } },
    }),
  ]);

  // Считаем в JS, а не через Prisma `groupBy`: группировка нужна по полю
  // связанной модели (`Track.artist`), а groupBy Prisma умеет только по
  // колонкам самой модели. Для личного дневника (десятки-сотни постов)
  // это не проблема; на больших объёмах — переходить на raw SQL с
  // GROUP BY, как в lib/search.ts.
  const uniqueTrackIds = new Set(postTracks.map((pt) => pt.trackId));

  const countByArtist = new Map<string, number>();
  for (const pt of postTracks) {
    const artist = pt.track.artist;
    countByArtist.set(artist, (countByArtist.get(artist) ?? 0) + 1);
  }

  const topArtists = [...countByArtist.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ARTISTS_LIMIT)
    .map(([artist, count]) => ({ artist, count }));

  return {
    postCount,
    likesReceived,
    uniqueTrackCount: uniqueTrackIds.size,
    topArtists,
  };
}
