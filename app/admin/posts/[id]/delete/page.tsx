import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getPostForDeletion } from "@/lib/admin-queries";
import { formatPostDate } from "@/lib/format-date";
import { pillButtonPrimary } from "@/lib/ui";
import { deletePostAsAdmin } from "@/app/admin/actions";

/*
  Подтверждение удаления записи.

  Отдельная страница, а не один клик в списке и не браузерный confirm():
  калибр разрушения другой, чем у комментария. Гибнет чужой текст, а вместе
  с ним каскадом уходят все комментарии под ним и все лайки — страница обязана
  назвать это числами до того, как кнопка нажата. Плюс confirm() в проекте не
  встречается ни разу: он завёл бы первый блокирующий браузерный диалог
  и сломал zero-JS.

  Гард `requireAdmin()` — здесь, а не только в layout: layout не решает,
  отрендерится ли страница.
*/

export const dynamic = "force-dynamic";

interface DeletePostPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeletePostPage({ params }: DeletePostPageProps) {
  await requireAdmin();

  const { id } = await params;
  const post = await getPostForDeletion(id);
  if (!post) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="font-serif text-xl text-ink">Удалить запись?</h2>
        <p className="text-sm text-muted">
          Автор <span className="text-ink">{post.author.name}</span> (@
          {post.author.username}), {formatPostDate(post.createdAt)}
        </p>
      </header>

      {/*
        Единственное место в админке, где текст набран `.prose-diary`: здесь
        запись именно читают, а не сканируют строку списка. В остальных
        разделах антиквы нет — там указатели, а не чтение.
      */}
      <div className="rounded-card border border-line bg-surface p-4">
        {post.text.trim() ? (
          <p className="prose-diary whitespace-pre-wrap text-ink">{post.text}</p>
        ) : (
          <p className="text-sm text-muted">Без текста, только дорожки.</p>
        )}
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted">
        <p>Вместе с записью исчезнут:</p>
        <ul className="list-inside list-disc">
          <li>комментариев: {post._count.comments}</li>
          <li>лайков: {post._count.likes}</li>
          <li>прикреплённых дорожек: {post._count.tracks}</li>
        </ul>
        {/*
          Треки не гибнут — каскад сносит только связи post_track. Сказать это
          прямо важнее, чем кажется: без строки модератор решает, что удаление
          записи выкидывает музыку из базы, и не решается нажать.
        */}
        <p>
          Сами треки останутся в базе — это кэш метаданных, а не часть записи.
        </p>
      </div>

      <form action={deletePostAsAdmin} className="flex items-center gap-4">
        <input type="hidden" name="postId" value={post.id} />
        <button type="submit" className={pillButtonPrimary}>
          Удалить запись
        </button>
        {/* «Отмена» обычной ссылкой: залитая кнопка на экране ровно одна. */}
        <Link
          href="/admin/posts"
          className="text-sm text-muted transition-colors hover:text-accent"
        >
          Отмена
        </Link>
        <Link
          href={`/u/${post.author.username}/${post.slug}`}
          className="ml-auto text-sm text-muted transition-colors hover:text-accent"
        >
          Открыть запись
        </Link>
      </form>
    </div>
  );
}
