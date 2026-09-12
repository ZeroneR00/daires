import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { REPORT_STATUS, type ReportStatus } from "@/lib/report-schema";

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
  openReportCount: number;
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
    openReportCount,
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
    // Открытые жалобы — единственный счётчик сводки, который зовёт к действию,
    // а не описывает состояние. Индекс `[status, createdAt]` покрывает его
    // целиком: фильтр по первому полю пары.
    prisma.report.count({ where: { status: REPORT_STATUS.open } }),
  ]);

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
    openReportCount,
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

/*
  ─── Пользователи ──────────────────────────────────────────────────────────
*/

const adminUserRow = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  _count: { select: { posts: true, comments: true } },
} satisfies Prisma.UserSelect;

export type AdminUserRow = Prisma.UserGetPayload<{
  select: typeof adminUserRow;
}>;

export async function getAdminUsersPage(params: {
  page: number;
  q?: string;
}): Promise<AdminPage<AdminUserRow>> {
  /*
    Поиск сразу по трём полям через OR — и снова `contains`, а не
    полнотекстовый поиск из lib/search.ts. Довод тот же, что у записей, плюс
    два своих: FTS по пользователям стоит на конфиге `simple`, то есть матчит
    слова целиком («zer» не найдёт «ZeroneR»), а email в тот индекс не входит
    вовсе — а модератору чаще всего дают именно кусок адреса или ника.

    Email тут ищется, но НЕ показывается никому, кроме админа: страница лежит
    под `requireAdmin()`, наружу это поле не уходит ни в одном публичном
    запросе.
  */
  const where: Prisma.UserWhereInput = params.q
    ? {
        OR: [
          { username: { contains: params.q, mode: "insensitive" } },
          { name: { contains: params.q, mode: "insensitive" } },
          { email: { contains: params.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (params.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: adminUserRow,
    }),
    prisma.user.count({ where }),
  ]);

  return { rows, total, page: params.page, pageCount: pageCountOf(total) };
}

/*
  Всё, что погибнет вместе с пользователем, — числами.

  Считаем не «сколько у него всего», а сколько строк реально снесёт каскад,
  и отдельно выделяем ЧУЖОЕ. Это главное, что страница подтверждения обязана
  сказать вслух: удаление человека уносит и чужие комментарии под его
  записями, и чужие сообщения в общих с ним диалогах, и чужие лайки на его
  записях. Из схемы это видно только тому, кто держит в голове две ступени
  каскада (`User → Post → Comment`, `User → Conversation → Message`).

  Разбиение «своё / чужое» непересекающееся: свои комментарии — все, где он
  автор (в том числе под своими же записями), чужие — под его записями за
  вычетом его собственных. Складывать их можно без риска задвоения.
*/
export interface UserDeletionSummary {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: Date;
  posts: number;
  ownComments: number;
  foreignComments: number;
  ownLikes: number;
  foreignLikes: number;
  following: number;
  followers: number;
  friendRequests: number;
  friendships: number;
  conversations: number;
  ownMessages: number;
  foreignMessages: number;
  sessions: number;
  accounts: number;
}

export async function getUserForDeletion(
  userId: string,
): Promise<UserDeletionSummary | null> {
  /*
    Прямые связи берём одним `_count` — Prisma разворачивает его в
    коррелированные подзапросы к одной строке, это дешевле десятка отдельных
    `count()`. Двухступенчатое (чужое) так не сосчитать: `_count` умеет только
    считать связь по одному ребру, а тут нужно «через запись» и «через диалог».
  */
  const [user, foreignComments, foreignLikes, foreignMessages] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              likes: true,
              following: true,
              followers: true,
              sentFriendRequests: true,
              receivedFriendRequests: true,
              friendshipsA: true,
              friendshipsB: true,
              conversationsA: true,
              conversationsB: true,
              sentMessages: true,
              sessions: true,
              accounts: true,
            },
          },
        },
      }),
      prisma.comment.count({
        where: { post: { authorId: userId }, authorId: { not: userId } },
      }),
      prisma.like.count({
        where: { post: { authorId: userId }, userId: { not: userId } },
      }),
      prisma.message.count({
        where: {
          conversation: {
            OR: [{ userAId: userId }, { userBId: userId }],
          },
          senderId: { not: userId },
        },
      }),
    ]);

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    posts: user._count.posts,
    ownComments: user._count.comments,
    foreignComments,
    ownLikes: user._count.likes,
    foreignLikes,
    following: user._count.following,
    followers: user._count.followers,
    // Заявки и дружбы — двусторонние модели с двумя ролями, поэтому у обеих
    // складываем обе стороны. Тот же приём, что в счётчике «N друзей» на
    // публичном профиле: одной парой Prisma при self-relation не считает.
    friendRequests:
      user._count.sentFriendRequests + user._count.receivedFriendRequests,
    friendships: user._count.friendshipsA + user._count.friendshipsB,
    conversations: user._count.conversationsA + user._count.conversationsB,
    ownMessages: user._count.sentMessages,
    foreignMessages,
    sessions: user._count.sessions,
    accounts: user._count.accounts,
  };
}

/*
  ─── Жалобы ────────────────────────────────────────────────────────────────

  Строка списка тянет и запись, и комментарий — заполнено всегда ровно одно
  (инвариант держит CHECK в миграции, см. комментарий у модели `Report`).
  Оба вложения дают адрес публичной страницы: у жалобы на комментарий он
  собирается из записи, под которой тот лежит.

  Текст цели тянем прямо в строку, а не отдельной страницей «разобрать»:
  чтобы решить, жалоба ли это по делу, модератор должен видеть сам объект,
  и уходить за ним со списка — лишний шаг на каждую строку.
*/
const adminReportRow = {
  id: true,
  reason: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  reporter: { select: { username: true, name: true } },
  post: {
    select: {
      slug: true,
      text: true,
      author: { select: { username: true } },
    },
  },
  comment: {
    select: {
      text: true,
      author: { select: { username: true } },
      post: { select: { slug: true, author: { select: { username: true } } } },
    },
  },
} satisfies Prisma.ReportSelect;

export type AdminReportRow = Prisma.ReportGetPayload<{
  select: typeof adminReportRow;
}>;

/**
 * Список жалоб. `status: undefined` — показать все; по умолчанию страница
 * просит `open`, потому что разбор идёт именно по ним.
 *
 * Сортировка — старые сверху (`asc`), в отличие от всех остальных списков
 * админки: жалоба это очередь, а не лента, и первой разбирают ту, что дольше
 * всех ждёт. Пара с `id` — по тому же доводу, что и везде.
 */
export async function getAdminReportsPage(params: {
  page: number;
  status?: ReportStatus;
}): Promise<AdminPage<AdminReportRow>> {
  const where: Prisma.ReportWhereInput = params.status
    ? { status: params.status }
    : {};

  const [rows, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (params.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: adminReportRow,
    }),
    prisma.report.count({ where }),
  ]);

  return { rows, total, page: params.page, pageCount: pageCountOf(total) };
}

/**
 * Сколько жалоб ждёт разбора — для бейджа в навигации админки.
 *
 * Отдельный запрос, а не поле из `getAdminOverview()`: бейдж нужен в layout
 * на всех страницах админки, а сводка считает десяток счётчиков и нужна
 * только дашборду.
 */
export async function getOpenReportCount(): Promise<number> {
  return prisma.report.count({ where: { status: REPORT_STATUS.open } });
}

/*
  ─── Треки ─────────────────────────────────────────────────────────────────

  Раздел показывает не все треки, а только осиротевшие — те, что не
  прикреплены ни к одной записи. Список всех треков модератору не нужен:
  живой трек виден в своей записи, и делать с ним по отдельности нечего.

  Откуда сироты берутся: `Track` — это кэш метаданных по `externalId`, общий
  на весь сайт (правило «перед созданием Track всегда upsert по externalId»).
  Удаление записи каскадит только связь `PostTrack`, сам трек остаётся. Значит
  сирота — не битая строка, а ОСТЫВШИЙ КЭШ: её удаление стоит ровно одного
  лишнего похода в iTunes, когда трек понадобится снова.

  Поэтому раздел — гигиена, а не обязанность, и звучать должен так же
  («N треков ни в одной записи»), без призыва чистить.
*/

/**
 * Условие «сирота» — одно на чтение и на удаление.
 *
 * Вынесено в константу намеренно: список и `deleteMany` в экшене обязаны
 * фильтровать ОДИНАКОВО, иначе кнопка снесёт не то, что было показано.
 * `Track.posts` — это `PostTrack[]`, поэтому пустота пишется через `none`.
 */
export const orphanTrackWhere = {
  posts: { none: {} },
} satisfies Prisma.TrackWhereInput;

/*
  Поиска по этому списку нет намеренно — в отличие от записей, комментариев
  и пользователей. Там модератор ищет конкретный объект по жалобе; здесь
  искать нечего: строки безымянны для модерации, их разбирают оптом.
*/
const adminTrackRow = {
  id: true,
  externalId: true,
  source: true,
  title: true,
  artist: true,
  album: true,
  createdAt: true,
} satisfies Prisma.TrackSelect;

export type AdminTrackRow = Prisma.TrackGetPayload<{
  select: typeof adminTrackRow;
}>;

/**
 * Страница осиротевших треков плюс общее число треков — для строки
 * «ни в одной записи: N из M». Без знаменателя число сирот ничего не говорит:
 * 40 из 45 и 40 из 4000 — это разные новости.
 */
export async function getAdminOrphanTracksPage(params: {
  page: number;
}): Promise<AdminPage<AdminTrackRow> & { trackTotal: number }> {
  const [rows, total, trackTotal] = await Promise.all([
    prisma.track.findMany({
      where: orphanTrackWhere,
      // Пара `createdAt` + `id`, как во всех списках админки: одного
      // `createdAt` мало, порядок внутри миллисекунды иначе не определён.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (params.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: adminTrackRow,
    }),
    prisma.track.count({ where: orphanTrackWhere }),
    prisma.track.count(),
  ]);

  return {
    rows,
    total,
    page: params.page,
    pageCount: pageCountOf(total),
    trackTotal,
  };
}
