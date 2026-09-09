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
