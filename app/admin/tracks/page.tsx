import { requireAdmin } from "@/lib/admin";
import {
  ADMIN_PAGE_SIZE,
  getAdminOrphanTracksPage,
  parsePageParam,
} from "@/lib/admin-queries";
import { formatPostDate } from "@/lib/format-date";
import { plural } from "@/lib/plural";
import { pillButtonPrimary } from "@/lib/ui";
import { AdminPager } from "@/components/admin/AdminPager";
import { deleteOrphanTracks } from "@/app/admin/actions";

/*
  Осиротевшие треки — те, что не прикреплены ни к одной записи.

  Раздел единственный в админке, где действие не про модерацию: тут никто не
  нарушал правил, тут просто остывший кэш (почему сироты вообще появляются —
  в шапке «Треки» в lib/admin-queries.ts). Отсюда весь тон страницы: сначала
  объяснение, что это не проблема, и только потом кнопка.

  Страницы подтверждения нет — в отличие от удаления записи и пользователя.
  Довод не в количестве строк, а в том, что гибнет: там пропадал чужой текст
  и чужие связи безвозвратно, здесь — строка кэша, которая вернётся сама при
  следующем поиске трека. Спрашивать «точно?» там, где ответ ничего не стоит,
  значит обесценить тот же вопрос на странице удаления пользователя.
*/

export const dynamic = "force-dynamic";

interface AdminTracksPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminTracksPage({
  searchParams,
}: AdminTracksPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const page = parsePageParam(params.page);

  const { rows, total, pageCount, trackTotal } = await getAdminOrphanTracksPage(
    { page },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-serif text-xl text-ink">Треки</h2>
        <p className="text-sm text-muted">
          Ни в одной записи: {total} из {trackTotal}
          {pageCount > 1 && ` · страница ${page} из ${pageCount}`}
        </p>
      </div>

      <p className="max-w-2xl text-sm text-muted">
        Трек хранится один на весь сайт и остаётся в базе, когда последняя
        запись с ним удалена. Это кэш метаданных, а не часть записи: удалённый
        вернётся сам, как только его снова найдут при создании записи. Чистить
        необязательно.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          Осиротевших треков нет — каждый трек в базе прикреплён хотя бы
          к одной записи.
        </p>
      ) : (
        <>
          {/*
            Кнопка выше списка, а не под ним: она сносит ВСЕ сироты, а не
            показанную страницу, и искать её после тридцати строк незачем.
            Число в подписи — общее по той же причине.

            Поштучного «Удалить» в строках нет намеренно — довод в комментарии
            к `deleteOrphanTracks`.
          */}
          <form action={deleteOrphanTracks}>
            <button type="submit" className={pillButtonPrimary}>
              Удалить {total}{" "}
              {plural(total, "осиротевший", "осиротевших", "осиротевших")}{" "}
              {plural(total, "трек", "трека", "треков")}
            </button>
          </form>

          <ul className="divide-y divide-line">
            {rows.map((track) => (
              <li
                key={track.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
              >
                {/*
                  min-w-0 обязателен: без него `truncate` внутри flex-колонки
                  не срабатывает — колонка раздувается под длину строки.
                */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm text-ink">
                    {track.title}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {track.artist}
                    {track.album && ` · ${track.album}`}
                  </span>
                </div>

                {/*
                  Источник рядом с датой: по нему видно, чей это кэш — iTunes
                  или MusicBrainz, — а дата говорит, как давно строка лежит
                  без дела.
                */}
                <span className="shrink-0 text-xs text-muted">
                  {track.source} · {formatPostDate(track.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <AdminPager
        basePath="/admin/tracks"
        page={page}
        pageCount={pageCount}
        params={params}
      />

      {total > ADMIN_PAGE_SIZE && (
        <p className="text-xs text-muted">
          По {ADMIN_PAGE_SIZE} треков на странице.
        </p>
      )}
    </div>
  );
}
