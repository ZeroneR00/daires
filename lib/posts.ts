import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const postWithDetails = {
  include: {
    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
    tracks: { orderBy: { position: "asc" }, include: { track: true } },
    _count: { select: { likes: true } },
  },
} satisfies Prisma.PostDefaultArgs;

export type PostWithDetails = Prisma.PostGetPayload<typeof postWithDetails>;

/*
  Обе ленты сайта листаются курсором и отдаются порциями — размеры разные
  намеренно. Первая должна уверенно переполнить экран: не переполнила — нечего
  скроллить, и подгрузка никогда не запустится. Дальше наоборот, чем меньше
  пачка, тем короче пауза и незаметнее шов.
*/
const FEED_FIRST_SIZE = 10;
const FEED_MORE_SIZE = 8;

/*
  Порядок двухступенчатый: `createdAt`, а при совпадении — `id`. Одного
  `createdAt` мало: у двух записей, созданных в одну миллисекунду, взаимный
  порядок не определён, база вправе вернуть их по-разному в двух соседних
  запросах — и курсор на такой паре либо повторит запись, либо перепрыгнет.
  `id` уникален и достраивает сортировку до строгой.
*/
const feedOrderBy: Prisma.PostOrderByWithRelationInput[] = [
  { createdAt: "desc" },
  { id: "desc" },
];

export interface FeedPage {
  posts: PostWithDetails[];
  /** id последней выданной записи; `null` — дальше ничего нет */
  nextCursor: string | null;
}

/*
  Курсор, а не `skip`: пока читатель листает, кто-то пишет новую запись, всё
  съезжает на позицию вниз — и при оффсете последняя запись прошлой порции
  приезжает второй раз. Курсор привязан к строке, вставки выше него на выдачу
  не влияют.

  Запрашиваем на одну запись больше, чем отдаём: лишняя не показывается, она
  нужна только чтобы отличить «дальше есть» от «лента кончилась». Иначе пришлось
  бы либо считать `count()` вторым запросом, либо оставлять читателю кнопку
  «Ещё», ведущую в пустоту.
*/
async function getFeedPage(
  where: Prisma.PostWhereInput,
  cursor?: string,
): Promise<FeedPage> {
  const size = cursor ? FEED_MORE_SIZE : FEED_FIRST_SIZE;

  const posts = await prisma.post.findMany({
    ...postWithDetails,
    where,
    orderBy: feedOrderBy,
    take: size + 1,
    // `skip: 1` — сама запись-курсор уже показана в предыдущей порции
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > size;
  if (hasMore) posts.pop();

  return {
    posts,
    nextCursor: hasMore ? posts[posts.length - 1].id : null,
  };
}

export function getFeedPosts(cursor?: string): Promise<FeedPage> {
  return getFeedPage({}, cursor);
}

/*
  Отдельный вход для RSS, хотя запрос почти тот же. Размер порции у ленты —
  вопрос вёрстки (сколько влезает в экран и сколько не жалко подгрузить),
  у фида — вопрос протокола (сколько записей ждёт читалка). Пока это было
  одно число, правка вёрстки молча укорачивала фид: ровно так первая версия
  этого шага и урезала общий фид с двадцати записей до десяти.
*/
export function getRecentPosts(limit: number): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    orderBy: feedOrderBy,
    take: limit,
  });
}

/*
  Обложки для стены на первом экране. Раньше их доставали из уже загруженной
  ленты, но лента ужалась до десяти записей — стене такого набора мало, она
  зациклилась бы на нескольких картинках. Запрос отдельный и дешёвый: только
  адреса, без самих записей и их связей.
*/
export async function getRecentArtworks(limit = 60): Promise<string[]> {
  const rows = await prisma.postTrack.findMany({
    take: limit,
    orderBy: { post: { createdAt: "desc" } },
    select: { track: { select: { artworkUrl: true } } },
  });

  return rows
    .map((row) => row.track.artworkUrl)
    .filter((url): url is string => url !== null);
}

/*
  Записи за одни сутки. Границы приходят готовыми из `dayKeyToRange` — этот
  слой про пояса ничего не знает и знать не должен, иначе решение «какой день
  считать днём» размазалось бы по двум файлам.

  `lt`, а не `lte`: интервал полуоткрытый, иначе запись, созданная ровно в
  полночь, попала бы разом в двое суток. `take` нет намеренно — сутки и так
  ограничивают выдачу, ровно как дневник в `getPostsByUsername`.
*/
export function getPostsByDay(
  start: Date,
  end: Date,
  username?: string,
): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    where: {
      createdAt: { gte: start, lt: end },
      ...(username ? { author: { username } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getPostsByUsername(username: string): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    where: { author: { username } },
    orderBy: { createdAt: "desc" },
  });
}

export function getPostBySlug(
  username: string,
  slug: string,
): Promise<PostWithDetails | null> {
  return prisma.post.findFirst({
    ...postWithDetails,
    where: { slug, author: { username } },
  });
}

export function getPostById(id: string): Promise<PostWithDetails | null> {
  return prisma.post.findUnique({
    ...postWithDetails,
    where: { id },
  });
}

export function getPostsByIds(ids: string[]): Promise<PostWithDetails[]> {
  return prisma.post.findMany({
    ...postWithDetails,
    where: { id: { in: ids } },
  });
}

export async function getLikedPostIds(
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  const likes = await prisma.like.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(likes.map((like) => like.postId));
}

export function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, friendshipsA: true, friendshipsB: true },
      },
    },
  });
}

export function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  return prisma.follow
    .findUnique({ where: { followerId_followingId: { followerId, followingId } } })
    .then(Boolean);
}

export function getFollowingFeedPosts(
  userId: string,
  cursor?: string,
): Promise<FeedPage> {
  return getFeedPage(
    { author: { followers: { some: { followerId: userId } } } },
    cursor,
  );
}

const commentWithAuthor = {
  include: {
    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
  },
} satisfies Prisma.CommentDefaultArgs;

export type CommentWithAuthor = Prisma.CommentGetPayload<typeof commentWithAuthor>;

export function getCommentsForPost(postId: string): Promise<CommentWithAuthor[]> {
  return prisma.comment.findMany({
    ...commentWithAuthor,
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
}
