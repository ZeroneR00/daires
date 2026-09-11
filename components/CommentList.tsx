import { formatPostDate } from "@/lib/format-date";
import { Avatar } from "@/components/Avatar";
import { ReportButton } from "@/components/ReportButton";
import type { CommentWithAuthor } from "@/lib/posts";

interface CommentListProps {
  comments: CommentWithAuthor[];
  currentUserId?: string;
  deleteAction: (formData: FormData) => Promise<void>;
  /*
    Жалоба приходит экшеном, как и удаление: список остаётся презентационным
    и ничего не импортирует из роута. Цель привязывается здесь — `bind` на
    каждый комментарий, поэтому нужен весь экшен, а не заранее связанный.
    Тип объявлен свой, минимальный (как у `UserResultRow`), вместо импорта
    `ReportTarget` из "use server"-файла.

    Необязателен: у гостя жаловаться не на что — страница передаёт `undefined`.
  */
  reportAction?: (
    target: { commentId: string },
    reason: string,
  ) => Promise<{ error: string } | { success: true }>;
}

export function CommentList({
  comments,
  currentUserId,
  deleteAction,
  reportAction,
}: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted">Комментариев пока нет</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((comment) => (
        /* Комментарий — своя маленькая карточка на бумаге: запись выше лежит
           на surface, обсуждение под ней остаётся тише на тон */
        <li
          key={comment.id}
          className="flex gap-3 rounded-card border border-line bg-surface/70 p-4"
        >
          <Avatar url={comment.author.avatarUrl} size={32} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate font-medium text-ink">
                  {comment.author.name}
                </span>
                <span className="shrink-0 text-muted">
                  {formatPostDate(comment.createdAt)}
                </span>
              </div>
              {comment.authorId === currentUserId && (
                <form action={deleteAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-muted transition-colors hover:text-accent"
                  >
                    Удалить
                  </button>
                </form>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{comment.text}</p>

            {/*
              Жалоба — под текстом, а не в строке с именем: раскрытая форма
              иначе вклинивалась бы между шапкой комментария и самим текстом.
              Заодно выходит та же расстановка, что на странице записи:
              действия владельца («Удалить», «Редактировать») сверху,
              действие читателя — снизу, под тем, о чём речь.

              text-xs задан здесь, а не внутри кнопки: `ReportButton` размер
              наследует. flex-wrap — чтобы раскрытая форма легла во всю ширину.
            */}
            {reportAction && comment.authorId !== currentUserId && (
              <div className="flex flex-wrap text-xs">
                <ReportButton
                  action={reportAction.bind(null, { commentId: comment.id })}
                />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
