import { formatPostDate } from "@/lib/format-date";
import { Avatar } from "@/components/Avatar";
import type { CommentWithAuthor } from "@/lib/posts";

interface CommentListProps {
  comments: CommentWithAuthor[];
  currentUserId?: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

export function CommentList({ comments, currentUserId, deleteAction }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Комментариев пока нет</p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3">
          <Avatar url={comment.author.avatarUrl} size={28} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-black dark:text-zinc-50">
                  {comment.author.name}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {formatPostDate(comment.createdAt)}
                </span>
              </div>
              {comment.authorId === currentUserId && (
                <form action={deleteAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button
                    type="submit"
                    className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                  >
                    Удалить
                  </button>
                </form>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-black dark:text-zinc-50">
              {comment.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
