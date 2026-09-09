import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getAdminOverview, getAdminRecentActivity } from "@/lib/admin-queries";
import { formatPostDate } from "@/lib/format-date";

/*
  Дашборд админки.

  `requireAdmin()` продублирован здесь при том, что он же стоит в layout, —
  это не копипаста: layout не решает, отрендерится ли страница, см. комментарий
  в `app/admin/layout.tsx`.

  Форма цифр — колофон `ProfileStats`: подпись сверху, число снизу. Дело не в
  красоте, а в русской плюрализации: в обратном порядке блок читался бы
  «12 Записей» и потребовал бы трёх ветвей согласования на каждое число.

  Коробок вокруг цифр нет — они лежат прямо на бумаге. Правило ветки:
  карточка бывает только вокруг того, на чём пишут или что читают.
*/

export const dynamic = "force-dynamic";

const sectionTitleClassName =
  "text-xs font-semibold uppercase tracking-widest text-muted";

const POST_EXCERPT_LENGTH = 80;

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [overview, recent] = await Promise.all([
    getAdminOverview(),
    getAdminRecentActivity(),
  ]);

  /*
    `href` есть только у тех плиток, чей раздел уже существует: мёртвая ссылка
    хуже её отсутствия. Пользователи и треки получат его на своих этапах.
  */
  const tiles: {
    label: string;
    value: number;
    note?: string;
    href?: string;
  }[] = [
    { label: "Пользователей", value: overview.userCount, note: `из них пишут: ${overview.authorCount}`, href: "/admin/users" },
    { label: "Новых за неделю", value: overview.newUserCount },
    { label: "Записей", value: overview.postCount, note: `за неделю: ${overview.newPostCount}`, href: "/admin/posts" },
    { label: "Комментариев", value: overview.commentCount, href: "/admin/comments" },
    { label: "Лайков", value: overview.likeCount },
    { label: "Треков", value: overview.trackCount, note: `ни в одной записи: ${overview.orphanTrackCount}` },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted">{tile.label}</span>
            {tile.href ? (
              <Link
                href={tile.href}
                className="font-serif text-2xl leading-none text-ink transition-colors hover:text-accent"
              >
                {tile.value}
              </Link>
            ) : (
              <span className="font-serif text-2xl leading-none text-ink">
                {tile.value}
              </span>
            )}
            {tile.note && (
              <span className="text-xs text-muted">{tile.note}</span>
            )}
          </div>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClassName}>Последние регистрации</h2>
          {recent.users.length === 0 ? (
            <p className="text-sm text-muted">Пока никто не зарегистрировался.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
                  <Link
                    href={`/u/${user.username}`}
                    className="truncate text-sm text-ink transition-colors hover:text-accent"
                  >
                    {user.name}{" "}
                    <span className="text-muted">@{user.username}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {formatPostDate(user.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClassName}>Последние записи</h2>
          {recent.posts.length === 0 ? (
            <p className="text-sm text-muted">Записей пока нет.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.posts.map((post) => (
                <li
                  key={post.id}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
                  <Link
                    href={`/u/${post.author.username}/${post.slug}`}
                    className="truncate text-sm text-ink transition-colors hover:text-accent"
                  >
                    {/*
                      Запись бывает вовсе без текста — правило проекта «текст
                      ИЛИ трек», поэтому у отрывка обязана быть подмена,
                      иначе строка выйдет пустой ссылкой.
                    */}
                    {post.text.trim() ? (
                      excerpt(post.text)
                    ) : (
                      <span className="text-muted">Без текста, только дорожки</span>
                    )}{" "}
                    <span className="text-muted">@{post.author.username}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-muted">
                    {formatPostDate(post.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function excerpt(text: string): string {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length > POST_EXCERPT_LENGTH
    ? `${flat.slice(0, POST_EXCERPT_LENGTH)}…`
    : flat;
}
