import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatPostDate } from "@/lib/format-date";
import { artworkAtSize } from "@/lib/artwork";
import { getPostBySlug, getCommentsForPost, getLikedPostIds } from "@/lib/posts";
import { buildQueue } from "@/lib/track-queue";
import { PostTrackList } from "@/components/PostTrackList";
import { TrackArtwork } from "@/components/TrackArtwork";
import { Avatar } from "@/components/Avatar";
import { Groove } from "@/components/Groove";
import { LikeButton } from "@/components/LikeButton";
import { CommentForm } from "@/components/CommentForm";
import { CommentList } from "@/components/CommentList";
import { createComment, deleteComment } from "./actions";

export const dynamic = "force-dynamic";

interface PostPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { username, slug } = await params;
  const [session, post] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPostBySlug(username, slug),
  ]);

  if (!post) notFound();

  const comments = await getCommentsForPost(post.id);
  const likedPostIds = session
    ? await getLikedPostIds(session.user.id, [post.id])
    : new Set<string>();

  const isOwner = session?.user.id === post.authorId;

  // Первый трек — герой записи, как и в карточке ленты, но крупнее: здесь
  // запись читают, а не проглядывают. Остальные идут списком ниже.
  const [heroPostTrack, ...restTracks] = post.tracks;
  const hero = heroPostTrack?.track;
  const heroArtwork = artworkAtSize(hero?.artworkUrl ?? null, 400);
  const queue = buildQueue(post.tracks);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href={`/u/${post.author.username}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← Дневник {post.author.name}
      </Link>

      <article
        className="glow-card relative flex flex-col gap-6 overflow-hidden rounded-card border border-line bg-surface p-5 sm:p-8"
        style={
          { "--glow": heroArtwork ? `url(${heroArtwork})` : "none" } as React.CSSProperties
        }
      >
        <header className="flex items-center justify-between gap-3 text-sm text-muted">
          <Link
            href={`/u/${post.author.username}`}
            className="flex min-w-0 items-center gap-2.5 transition-colors hover:text-accent"
          >
            <Avatar url={post.author.avatarUrl} size={36} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">
                {post.author.name}
              </span>
              <span className="block truncate">
                {formatPostDate(post.createdAt)}
              </span>
            </span>
          </Link>

          {isOwner && (
            <Link
              href={`/post/${post.id}/edit`}
              className="shrink-0 transition-colors hover:text-accent"
            >
              Редактировать
            </Link>
          )}
        </header>

        {hero && heroArtwork && (
          /* relative z-10 — свечение карточки лежит на -1, но пластинка
             TrackArtwork выезжает абсолютом, и без слоя соседний текст
             оказался бы над ней */
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <TrackArtwork
              trackId={hero.id}
              artworkUrl={heroArtwork}
              previewUrl={hero.previewUrl}
              title={hero.title}
              artist={hero.artist}
              size={176}
              queue={queue}
            />
            <div className="min-w-0">
              <p className="font-serif text-xl leading-snug text-ink">
                {hero.title}
              </p>
              <p className="mt-1 text-sm text-muted">{hero.artist}</p>
              {hero.album && (
                <p className="mt-0.5 text-sm text-muted">{hero.album}</p>
              )}
            </div>
          </div>
        )}

        {post.text && (
          <p className="prose-diary relative z-10 whitespace-pre-wrap text-ink">
            {post.text}
          </p>
        )}

        <PostTrackList
          tracks={restTracks.map((postTrack) => postTrack.track)}
          queue={queue}
          heading="Ещё в записи"
        />

        {/* Простая линейка, а не знак: знак на этой странице стоит один раз —
            границей между записью и обсуждением, ниже */}
        <div className="flex items-center gap-4 border-t border-line pt-4 text-sm text-muted">
          {session ? (
            <LikeButton
              postId={post.id}
              authorUsername={post.author.username}
              slug={post.slug}
              initialLiked={likedPostIds.has(post.id)}
              initialCount={post._count.likes}
            />
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 transition-colors hover:text-accent"
            >
              <span aria-hidden className="text-base leading-none">♡</span>
              {post._count.likes}
            </Link>
          )}
        </div>
      </article>

      {/* Запись кончилась, дальше говорят о ней — знак ровно здесь и только здесь */}
      <Groove className="py-2" />

      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-lg tracking-tight text-ink">
          Комментарии
          {comments.length > 0 && (
            <span className="ml-2 font-sans text-sm font-normal text-muted">
              {comments.length}
            </span>
          )}
        </h2>

        <CommentList
          comments={comments}
          currentUserId={session?.user.id}
          deleteAction={deleteComment}
        />

        {session ? (
          <CommentForm action={createComment.bind(null, post.id)} />
        ) : (
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            Войди, чтобы прокомментировать
          </Link>
        )}
      </section>
    </div>
  );
}
