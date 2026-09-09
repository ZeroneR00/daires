import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/*
  Все читающие запросы админки. Мутации живут отдельно (`app/admin/actions.ts`),
  гард — в `lib/admin.ts`: сюда сессия не приходит вообще, вызывающая страница
  уже проверила права.

  Почему не переиспользуем `getSiteStats()` из `lib/stats.ts`: тот отвечает на
  публичный вопрос первого экрана («N записей от M авторов») и считает авторами
  только тех, у кого есть хотя бы одна запись. Админке нужны оба числа сразу —
  и все зарегистрированные, и пишущие. Связать их одной функцией значило бы
  получить главную страницу, которая ломается при правке админки.
*/

const RECENT_DAYS = 7;
const RECENT_LIMIT = 5;

export interface AdminOverview {
  userCount: number;
  authorCount: number;
  newUserCount: number;
  postCount: number;
  newPostCount: number;
  commentCount: number;
  likeCount: number;
  trackCount: number;
  orphanTrackCount: number;
}

/**
 * Сводка для дашборда: все счётчики одним параллельным заходом.
 *
 * Это `count()`, а не выборки: Postgres считает их по индексам, и десяток
 * таких запросов в `Promise.all` дешевле одной страницы ленты. Если раздел
 * когда-нибудь начнёт тормозить — виноват будет не счёт, а размер базы,
 * и лечиться это будет кэшем на дашборде, а не сложением запросов.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const [
    userCount,
    authorCount,
    newUserCount,
    postCount,
    newPostCount,
    commentCount,
    likeCount,
    trackCount,
    orphanTrackCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { posts: { some: {} } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.post.count(),
    prisma.post.count({ where: { createdAt: { gte: since } } }),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.track.count(),
    // Сирота — трек, не прикреплённый ни к одной записи. `Track.posts` это
    // PostTrack[], поэтому условие пустоты пишется через `none`.
    // Такие треки появляются после удаления записей: каскад сносит связь
    // PostTrack, а сам трек остаётся — он кэш метаданных по externalId,
    // а не часть записи. Раздел «Треки» (этап 6) — гигиена, не обязанность.
    prisma.track.count({ where: { posts: { none: {} } } }),
  ]);

  // Жалобы (`open`) добавятся сюда на этапе 5 — десятым счётчиком в тот же
  // Promise.all, отдельного запроса на дашборде им не понадобится.

  return {
    userCount,
    authorCount,
    newUserCount,
    postCount,
    newPostCount,
    commentCount,
    likeCount,
    trackCount,
    orphanTrackCount,
  };
}

/*
  Два коротких списка под цифрами: кто зарегистрировался и что написали
  последним. Тонкий `select`, а не общий include `postWithDetails` из
  lib/posts.ts: тот тянет автора, все треки и `_count` — для пяти строк
  с датой и отрывком это лишние джойны.
*/
export interface AdminRecentActivity {
  users: {
    id: string;
    username: string;
    name: string;
    createdAt: Date;
  }[];
  posts: {
    id: string;
    slug: string;
    text: string;
    createdAt: Date;
    author: { username: string };
  }[];
}

export async function getAdminRecentActivity(): Promise<AdminRecentActivity> {
  // Сортировка парой `createdAt` + `id` — тот же довод, что в `getFeedPage`:
  // одного `createdAt` мало, порядок внутри одной миллисекунды иначе
  // не определён.
  const [users, posts] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: RECENT_LIMIT,
      select: { id: true, username: true, name: true, createdAt: true },
    }),
    prisma.post.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: RECENT_LIMIT,
      select: {
        id: true,
        slug: true,
        text: true,
        createdAt: true,
        author: { select: { username: true } },
      },
    }),
  ]);

  return { users, posts };
}

/*
  ─── Списки с пагинацией ───────────────────────────────────────────────────

  Пагинация страницами (`?page=N` + skip/take) в проекте больше нигде не
  встречается — ленты листаются курсором, и в AGENTS.md прямо записано, что
  страничной пагинации нет намеренно. Здесь это не нарушение, а другой случай.

  Довод против страниц звучал так: адресуемость, ради которой их обычно берут,
  у ленты уже есть сбоку — /day, дневник автора, поиск, RSS. У админского
  списка боковой адресуемости нет вообще, зато нужны две вещи, которых курсор
  не даёт: ответ «сколько всего» и прыжок сразу на седьмую страницу. А главная
  беда OFFSET'а — дрейф строк при вставке новых — модератору безвредна:
  он разбирает список, а не читает ленту.

  Порог деградации: OFFSET заставляет Postgres пройти и выбросить skip строк,
  так что на тысячах страниц это станет медленным. Тогда — курсор, как в
  getFeedPage.
*/

export const ADMIN_PAGE_SIZE = 30;

export interface AdminPage<T> {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Номер страницы из query-параметра.
 *
 * Мусор (`?page=abc`, `?page=-3`) — это тихо первая страница, а НЕ `notFound()`:
 * query-параметр не идентичность. Тем он и отличается от `/day/[date]`, где
 * ключ дня как раз идентичность и кривой ключ обязан давать 404.
 */
export function parsePageParam(value: string | undefined): number {
  return Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
}

function pageCountOf(total: number): number {
  return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
}

/*
  Тонкий row-тип вместо общего include `postWithDetails` из lib/posts.ts:
  тот тянет автора, ВСЕ треки записи и `_count`, а модератору в строке нужны
  дата, автор, отрывок и три числа. На тридцати строках разница — сотни
  лишних строк из post_track.

  `_count` при этом оставляем: это агрегирующий подзапрос, а не выборка самих
  комментариев с лайками, и именно он говорит, сколько всего погибнет
  при удалении.
*/
const adminPostRow = {
  id: true,
  slug: true,
  text: true,
  createdAt: true,
  author: { select: { username: true, name: true } },
  _count: { select: { comments: true, likes: true, tracks: true } },
} satisfies Prisma.PostSelect;

export type AdminPostRow = Prisma.PostGetPayload<{
  select: typeof adminPostRow;
}>;

export async function getAdminPostsPage(params: {
  page: number;
  q?: string;
  author?: string;
}): Promise<AdminPage<AdminPostRow>> {
  const where: Prisma.PostWhereInput = {};

  // `contains` + `mode: "insensitive"`, а не полнотекстовый поиск из
  // lib/search.ts. Расхождение сознательное: FTS матчит слова целиком
  // (по «zer» не найдётся «ZeroneR») и заточен под релевантность, а модератору
  // нужно ровно обратное — найти по куску строки всё, что её содержит.
  if (params.q) {
    where.text = { contains: params.q, mode: "insensitive" };
  }
  if (params.author) {
    where.author = { username: { equals: params.author, mode: "insensitive" } };
  }

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      // Пара `createdAt` + `id`: без второго ключа порядок внутри одной
      // миллисекунды не определён, и строка на границе страниц может
      // задвоиться или пропасть.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (params.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: adminPostRow,
    }),
    prisma.post.count({ where }),
  ]);

  return { rows, total, page: params.page, pageCount: pageCountOf(total) };
}

const adminCommentRow = {
  id: true,
  text: true,
  createdAt: true,
  author: { select: { username: true, name: true } },
  post: {
    select: { slug: true, author: { select: { username: true } } },
  },
} satisfies Prisma.CommentSelect;

export type AdminCommentRow = Prisma.CommentGetPayload<{
  select: typeof adminCommentRow;
}>;

export async function getAdminCommentsPage(params: {
  page: number;
  q?: string;
}): Promise<AdminPage<AdminCommentRow>> {
  const where: Prisma.CommentWhereInput = params.q
    ? { text: { contains: params.q, mode: "insensitive" } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (params.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: adminCommentRow,
    }),
    prisma.comment.count({ where }),
  ]);

  return { rows, total, page: params.page, pageCount: pageCountOf(total) };
}

/**
 * Запись для страницы подтверждения удаления: тут, в отличие от строки списка,
 * нужен полный текст — модератор должен видеть, что именно гибнет.
 */
export async function getPostForDeletion(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      slug: true,
      text: true,
      createdAt: true,
      author: { select: { username: true, name: true } },
      _count: { select: { comments: true, likes: true, tracks: true } },
    },
  });
}
