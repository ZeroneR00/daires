import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import {
  ADMIN_PAGE_SIZE,
  getAdminPostsPage,
  parsePageParam,
} from "@/lib/admin-queries";
import { formatPostDate } from "@/lib/format-date";
import { field } from "@/lib/ui";
import { AdminPager } from "@/components/admin/AdminPager";

/*
  Список всех записей сайта.

  Карточек вокруг строк нет: правило ветки — карточка бывает только вокруг
  того, на чём пишут или что читают, а строка списка это указатель. Отсюда
  плоский <ul> с волосяными линейками прямо на бумаге, как в /friends.

  Поиск — обычная GET-форма без единой строчки JS: submit меняет адрес,
  страница пересобирается на сервере. Заодно результат поиска получается
  адресуемым — ссылку на отфильтрованный список можно сохранить.
*/

export const dynamic = "force-dynamic";

const EXCERPT_LENGTH = 100;

interface AdminPostsPageProps {
  searchParams: Promise<{ page?: string; q?: string; author?: string }>;
}

export default async function AdminPostsPage({
  searchParams,
}: AdminPostsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const author = params.author?.trim() || undefined;
  const page = parsePageParam(params.page);

  const { rows, total, pageCount } = await getAdminPostsPage({
    page,
    q: query,
    author,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-serif text-xl text-ink">Записи</h2>
        <p className="text-sm text-muted">
          Всего: {total}
          {pageCount > 1 && ` · страница ${page} из ${pageCount}`}
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        {/*
          Скрытым полем тащим за собой фильтр по автору: без него поиск по
          тексту молча сбрасывал бы «показать записи такого-то». Параметр
          `page` не тащим намеренно — новый поиск обязан начинаться с первой
          страницы.
        */}
        {author && <input type="hidden" name="author" value={author} />}
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Поиск по тексту записи"
          className={`${field} max-w-xs`}
        />
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          Найти
        </button>
        {(query || author) && (
          <Link
            href="/admin/posts"
            className="px-2 text-sm text-muted transition-colors hover:text-accent"
          >
            Сбросить
          </Link>
        )}
      </form>

      {author && (
        <p className="text-sm text-muted">
          Только записи автора <span className="text-ink">@{author}</span>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {query || author
            ? "Ничего не нашлось по этому запросу."
            : "Записей пока нет."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((post) => (
            <li key={post.id} className="flex flex-col gap-1.5 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                <span>{formatPostDate(post.createdAt)}</span>
                {/*
                  Автор — ссылка не на его дневник, а на фильтр этого же
                  списка: модератору, дошедшему до плохой записи, обычно
                  нужны остальные записи того же человека.
                */}
                <Link
                  href={`/admin/posts?author=${encodeURIComponent(post.author.username)}`}
                  className="transition-colors hover:text-accent"
                >
                  @{post.author.username}
                </Link>
                <span>
                  комментариев: {post._count.comments} · лайков:{" "}
                  {post._count.likes} · дорожек: {post._count.tracks}
                </span>
              </div>

              <p className="text-sm text-ink">
                {post.text.trim() ? (
                  excerpt(post.text)
                ) : (
                  <span className="text-muted">Без текста, только дорожки</span>
                )}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <Link
                  href={`/u/${post.author.username}/${post.slug}`}
                  className="text-muted transition-colors hover:text-accent"
                >
                  Открыть
                </Link>
                {/*
                  Удаление — через страницу подтверждения, а не сразу формой:
                  гибнет чужой текст вместе с комментариями и лайками. Ссылка
                  тихая, красной становится в момент намерения — постоянный
                  text-danger дал бы токену второе значение, он закреплён
                  за ошибками форм.
                */}
                <Link
                  href={`/admin/posts/${post.id}/delete`}
                  className="text-muted transition-colors hover:text-danger focus-visible:text-danger"
                >
                  Удалить
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminPager
        basePath="/admin/posts"
        page={page}
        pageCount={pageCount}
        params={params}
      />

      {total > ADMIN_PAGE_SIZE && (
        <p className="text-xs text-muted">
          По {ADMIN_PAGE_SIZE} записей на странице.
        </p>
      )}
    </div>
  );
}

function excerpt(text: string): string {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length > EXCERPT_LENGTH
    ? `${flat.slice(0, EXCERPT_LENGTH)}…`
    : flat;
}
