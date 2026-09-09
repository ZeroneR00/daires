import Link from "next/link";
import { ADMIN_ROLE, USER_ROLE, requireAdmin } from "@/lib/admin";
import {
  ADMIN_PAGE_SIZE,
  getAdminUsersPage,
  parsePageParam,
} from "@/lib/admin-queries";
import { formatPostDate } from "@/lib/format-date";
import { field } from "@/lib/ui";
import { Avatar } from "@/components/Avatar";
import { AdminPager } from "@/components/admin/AdminPager";
import { setUserRole } from "@/app/admin/actions";

/*
  Список всех пользователей сайта.

  Аватар в строке — единственное отличие от списков записей и комментариев,
  и оно осознанное: там строка указывает на текст, и опознают её по тексту,
  а здесь на человека, и в лицо его узнают быстрее, чем по нику. Всё
  остальное то же — плоский <ul> без карточек, GET-форма поиска, листалка.

  Email показан только тут. Он есть в базе у каждого, но ни один публичный
  запрос проекта его не выбирает — раздел лежит под `requireAdmin()`, и это
  единственная страница, где адрес виден.
*/

export const dynamic = "force-dynamic";

interface AdminUsersPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  /*
    Сессия нужна не только ради гарда: строку самого админа рисуем иначе —
    без «Удалить» и без переключателя роли. Это UI-половина самозащиты,
    настоящая живёт в экшенах; прятать кнопку без гарда было бы обманом,
    а гард без спрятанной кнопки — кнопкой, которая молча ничего не делает.
  */
  const session = await requireAdmin();

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const page = parsePageParam(params.page);

  const { rows, total, pageCount } = await getAdminUsersPage({
    page,
    q: query,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-serif text-xl text-ink">Пользователи</h2>
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
          placeholder="Имя, ник или email"
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
            href="/admin/users"
            className="px-2 text-sm text-muted transition-colors hover:text-accent"
          >
            Сбросить
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {query
            ? "Ничего не нашлось по этому запросу."
            : "Пользователей пока нет."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((user) => {
            const isSelf = user.id === session.user.id;
            const isAdmin = user.role === ADMIN_ROLE;

            return (
              <li key={user.id} className="flex items-start gap-3 py-3">
                <Avatar url={user.avatarUrl} size={36} />

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link
                      href={`/u/${user.username}`}
                      className="text-sm text-ink transition-colors hover:text-accent"
                    >
                      {user.name}{" "}
                      <span className="text-muted">@{user.username}</span>
                    </Link>
                    {isAdmin && (
                      <span className="rounded-full bg-accent-wash px-2 py-0.5 text-xs font-medium text-accent">
                        админ
                      </span>
                    )}
                    {isSelf && <span className="text-xs text-muted">это ты</span>}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="truncate">{user.email}</span>
                    <span>{formatPostDate(user.createdAt)}</span>
                    <span>
                      записей: {user._count.posts} · комментариев:{" "}
                      {user._count.comments}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {/*
                      «Записи» ведут в фильтр списка записей, а не в дневник:
                      с этой страницы модератор идёт разбирать написанное,
                      и там у каждой строки уже есть «Удалить».
                    */}
                    <Link
                      href={`/admin/posts?author=${encodeURIComponent(user.username)}`}
                      className="text-muted transition-colors hover:text-accent"
                    >
                      Записи
                    </Link>

                    {/*
                      Свою роль не переключаем — форму просто не рисуем.
                      Zero-JS: роль едет скрытым полем, экшен сверяет её
                      с белым списком.
                    */}
                    {!isSelf && (
                      <form action={setUserRole}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={isAdmin ? USER_ROLE : ADMIN_ROLE}
                        />
                        <button
                          type="submit"
                          className="text-muted transition-colors hover:text-accent"
                        >
                          {isAdmin ? "Снять роль админа" : "Сделать админом"}
                        </button>
                      </form>
                    )}

                    {/*
                      «Удалить» нет ни у себя, ни у другого админа — те же два
                      случая, что закрыты гардами в `deleteUserAsAdmin`.
                      Разжаловать и удалить остаётся возможным, но это уже два
                      осознанных шага, а не один промах.
                    */}
                    {!isSelf && !isAdmin && (
                      <Link
                        href={`/admin/users/${user.id}/delete`}
                        className="text-muted transition-colors hover:text-danger focus-visible:text-danger"
                      >
                        Удалить
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminPager
        basePath="/admin/users"
        page={page}
        pageCount={pageCount}
        params={params}
      />

      {total > ADMIN_PAGE_SIZE && (
        <p className="text-xs text-muted">
          По {ADMIN_PAGE_SIZE} человек на странице.
        </p>
      )}
    </div>
  );
}
