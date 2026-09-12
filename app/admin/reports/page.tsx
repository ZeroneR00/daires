import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import {
  ADMIN_PAGE_SIZE,
  getAdminReportsPage,
  parsePageParam,
} from "@/lib/admin-queries";
import { formatMessageTime } from "@/lib/format-date";
import { REPORT_STATUS, isReportStatus } from "@/lib/report-schema";
import { AdminPager } from "@/components/admin/AdminPager";
import { resolveReport } from "@/app/admin/actions";

/*
  Разбор жалоб.

  Список по умолчанию показывает только открытые — это очередь работы, а не
  архив. Остальные статусы доступны фильтром: закрытые жалобы никуда не
  деваются, они история разбора.

  Кнопки удаления объекта здесь нет намеренно, хотя соблазн есть: удаление
  записи живёт на своей странице подтверждения (`/admin/posts/[id]/delete`)
  и показывает, что именно погибнет вместе с ней. Дублировать её кнопкой
  прямо из строки жалобы значило бы завести второй, более лёгкий путь к тому
  же необратимому действию. Поэтому отсюда — ссылка на объект, а сносят его
  в своём разделе; жалоба уйдёт каскадом сама.
*/

export const dynamic = "force-dynamic";

const filters = [
  { value: REPORT_STATUS.open, label: "Открытые" },
  { value: REPORT_STATUS.resolved, label: "Разобранные" },
  { value: REPORT_STATUS.dismissed, label: "Отклонённые" },
  { value: "all", label: "Все" },
] as const;

interface AdminReportsPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const page = parsePageParam(params.page);

  /*
    Мусор в `?status=` — это молча «открытые», как `?page=abc` молча первая
    страница: query-параметр не идентичность. `all` — единственное слово,
    которое статусом не является и означает «без фильтра».
  */
  const filter =
    params.status === "all"
      ? "all"
      : isReportStatus(params.status)
        ? params.status
        : REPORT_STATUS.open;

  const { rows, total, pageCount } = await getAdminReportsPage({
    page,
    status: filter === "all" ? undefined : filter,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-serif text-xl text-ink">Жалобы</h2>
        <p className="text-sm text-muted">
          Всего: {total}
          {pageCount > 1 && ` · страница ${page} из ${pageCount}`}
        </p>
      </div>

      {/* Фильтр — ссылки, а не переключатель: статус живёт в адресе, и
          «открытые» можно положить в закладки. Тот же приём, что у поисковой
          формы в соседних разделах. */}
      <nav className="flex flex-wrap items-center gap-1">
        {filters.map((option) => {
          const active = option.value === filter;
          return (
            <Link
              key={option.value}
              href={`/admin/reports?status=${option.value}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center rounded-full bg-accent-wash px-3 py-1.5 text-sm font-medium text-accent"
                  : "flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-accent-wash hover:text-accent"
              }
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {filter === REPORT_STATUS.open
            ? "Разбирать нечего — открытых жалоб нет."
            : "В этом разделе пусто."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((report) => {
            // Заполнено ровно одно из двух — инвариант держит CHECK в базе,
            // так что ветка исчерпывающая, а `null` в конце — только ради
            // типов: Prisma обоих полей про инвариант не знает.
            const target = report.post
              ? {
                  kind: "запись",
                  href: `/u/${report.post.author.username}/${report.post.slug}`,
                  author: report.post.author.username,
                  text: report.post.text,
                }
              : report.comment
                ? {
                    kind: "комментарий",
                    href: `/u/${report.comment.post.author.username}/${report.comment.post.slug}`,
                    author: report.comment.author.username,
                    text: report.comment.text,
                  }
                : null;

            return (
              <li key={report.id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{formatMessageTime(report.createdAt)}</span>
                  <span className="text-ink">@{report.reporter.username}</span>
                  {target ? (
                    <Link
                      href={target.href}
                      className="transition-colors hover:text-accent"
                    >
                      на {target.kind} @{target.author}
                    </Link>
                  ) : (
                    <span>объект удалён</span>
                  )}
                  {report.status !== REPORT_STATUS.open && report.resolvedAt && (
                    <span>
                      {report.status === REPORT_STATUS.resolved
                        ? "разобрано"
                        : "отклонено"}{" "}
                      {formatMessageTime(report.resolvedAt)}
                    </span>
                  )}
                </div>

                {/* Причина — голос жалобщика, поэтому она главная строка
                    и набрана как текст, а не как служебная подпись. */}
                <p className="whitespace-pre-wrap text-sm text-ink">
                  {report.reason}
                </p>

                {target && (
                  <p className="line-clamp-3 whitespace-pre-wrap border-l-2 border-line pl-3 text-sm text-muted">
                    {target.text || "(без текста)"}
                  </p>
                )}

                {/* Действия: у открытой — два решения, у закрытой — возврат
                    в очередь. Залитой кнопки здесь нет: на экране список,
                    а не одно главное действие. */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {report.status === REPORT_STATUS.open ? (
                    <>
                      <form action={resolveReport}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={REPORT_STATUS.resolved}
                        />
                        <button
                          type="submit"
                          className="text-muted transition-colors hover:text-accent focus-visible:text-accent"
                        >
                          Разобрано
                        </button>
                      </form>
                      <form action={resolveReport}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={REPORT_STATUS.dismissed}
                        />
                        <button
                          type="submit"
                          className="text-muted transition-colors hover:text-accent focus-visible:text-accent"
                        >
                          Отклонить
                        </button>
                      </form>
                    </>
                  ) : (
                    <form action={resolveReport}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="status" value={REPORT_STATUS.open} />
                      <button
                        type="submit"
                        className="text-muted transition-colors hover:text-accent focus-visible:text-accent"
                      >
                        Вернуть в открытые
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminPager
        basePath="/admin/reports"
        page={page}
        pageCount={pageCount}
        params={params}
      />

      {total > ADMIN_PAGE_SIZE && (
        <p className="text-xs text-muted">По {ADMIN_PAGE_SIZE} жалоб на странице.</p>
      )}
    </div>
  );
}
