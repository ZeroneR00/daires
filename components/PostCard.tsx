import Link from "next/link";
import { formatPostDate } from "@/lib/format-date";
import { TrackRow } from "@/components/TrackRow";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import type { PostWithDetails } from "@/lib/posts";

interface PostCardProps {
  post: PostWithDetails;
  showAuthor?: boolean;
  currentUserId?: string | null;
  isLiked?: boolean;
}

const EXCERPT_LENGTH = 240;

function excerpt(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

export function PostCard({
  post,
  showAuthor = true,
  currentUserId,
  isLiked = false,
}: PostCardProps) {
  const isOwner = currentUserId != null && currentUserId === post.authorId;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <div className="flex items-center justify-between gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        {showAuthor && (
          <Link
            href={`/u/${post.author.username}`}
            className="flex items-center gap-2 font-medium text-black dark:text-zinc-50"
          >
            <Avatar url={post.author.avatarUrl} size={32} />
            {post.author.name}
          </Link>
        )}
        <div className="flex items-center gap-3">
          {currentUserId ? (
            <LikeButton
              postId={post.id}
              authorUsername={post.author.username}
              slug={post.slug}
              initialLiked={isLiked}
              initialCount={post._count.likes}
            />
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 hover:underline">
              <span aria-hidden>♡</span>
              {post._count.likes}
            </Link>
          )}
          <Link href={`/u/${post.author.username}/${post.slug}`} className="hover:underline">
            {formatPostDate(post.createdAt)}
          </Link>
          {isOwner && (
            <Link href={`/post/${post.id}/edit`} className="hover:underline">
              Редактировать
            </Link>
          )}
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-black dark:text-zinc-50">
        {excerpt(post.text)}
      </p>

      {post.tracks.length > 0 && (
        <div className="flex flex-col gap-2">
          {post.tracks.map((postTrack) => (
            <TrackRow key={postTrack.id} track={postTrack.track} showPreview={false} />
          ))}
        </div>
      )}
    </article>
  );
}
