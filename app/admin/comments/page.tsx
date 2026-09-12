import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import {
  ADMIN_PAGE_SIZE,
  getAdminCommentsPage,
  parsePageParam,
} from "@/lib/admin-queries";
import { formatMessageTime } from "@/lib/format-date";
import { field } from "@/lib/ui";
import { AdminPager } from "@/components/admin/AdminPager";
import { deleteCommentAsAdmin } from "@/app/admin/actions";

/*
  Список всех комментариев сайта.

  Подтверждения у удаления нет намеренно — один клик. Это не небрежность,
  а выравнивание по весу: у себя на странице автор сносит свой комментарий
  тоже одним кликом, без вопросов. Разнобой («у админа спрашивают, у автора
  нет») читался бы страннее, чем риск: комментарий это одна строка, а не
  чужая запись с каскадом.

  Дата в формате переписки (день, месяц, время), а не как у записи: у ленты
  комментариев важен час — они идут пачками в один день.
*/

export const dynamic = "force-dynamic";

interface AdminCommentsPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function AdminCommentsPage({
  searchParams,
}: AdminCommentsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const page = parsePageParam(params.page);

  const { rows, total, pageCount } = await getAdminCommentsPage({
    page,
    q: query,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-serif text-xl text-ink">Комментарии</h2>
        <p className="text-sm text-muted">
          Всего: {total}
          {pageCount > 1 && ` · страница ${page} из ${pageCount}`}
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Поиск по тексту комментария"
          className={`${field} max-w-xs`}
        />
        <button
          type="submit"
          className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          Найти
        </button>
        {query && (
          <Link
            href="/admin/comments"
            className="px-2 text-sm text-muted transition-colors hover:text-accent"
          >
            Сбросить
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {query ? "Ничего не нашлось по этому запросу." : "Комментариев пока нет."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1.5 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                <span>{formatMessageTime(comment.createdAt)}</span>
                <span className="text-ink">@{comment.author.username}</span>
                <Link
                  href={`/u/${comment.post.author.username}/${comment.post.slug}`}
                  className="transition-colors hover:text-accent"
                >
                  под записью @{comment.post.author.username}
                </Link>
              </div>

              <p className="whitespace-pre-wrap text-sm text-ink">
                {comment.text}
              </p>

              {/*
                Zero-JS форма прямо в строке — как существующее «Удалить»
                у своего комментария на публичной странице.
              */}
              <form action={deleteCommentAsAdmin}>
                <input type="hidden" name="commentId" value={comment.id} />
                <button
                  type="submit"
                  className="text-sm text-muted transition-colors hover:text-danger focus-visible:text-danger"
                >
                  Удалить
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <AdminPager
        basePath="/admin/comments"
        page={page}
        pageCount={pageCount}
        params={params}
      />

      {total > ADMIN_PAGE_SIZE && (
        <p className="text-xs text-muted">
          По {ADMIN_PAGE_SIZE} комментариев на странице.
        </p>
      )}
    </div>
  );
}
