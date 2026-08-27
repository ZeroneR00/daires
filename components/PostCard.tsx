import Link from "next/link";
import { formatPostDate } from "@/lib/format-date";
import { artworkAtSize } from "@/lib/artwork";
import { TrackRow } from "@/components/TrackRow";
import { Avatar } from "@/components/Avatar";
import { TrackArtwork } from "@/components/TrackArtwork";
import { Groove } from "@/components/Groove";
import { LikeButton } from "@/components/LikeButton";
import type { PostWithDetails } from "@/lib/posts";

interface PostCardProps {
  post: PostWithDetails;
  showAuthor?: boolean;
  currentUserId?: string | null;
  isLiked?: boolean;
  showMark?: boolean;
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
  showMark = true,
}: PostCardProps) {
  const isOwner = currentUserId != null && currentUserId === post.authorId;
  const postHref = `/u/${post.author.username}/${post.slug}`;

  // Первый трек играет роль обложки записи, остальные идут списком ниже.
  const [heroPostTrack, ...restTracks] = post.tracks;
  const hero = heroPostTrack?.track;
  const heroArtwork = artworkAtSize(hero?.artworkUrl ?? null, 300);

  return (
    <article
      className="glow-card relative flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-5 transition-colors hover:border-accent/40"
      style={{ "--glow": heroArtwork ? `url(${heroArtwork})` : "none" } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        {showAuthor ? (
          <Link
            href={`/u/${post.author.username}`}
            className="flex min-w-0 items-center gap-2 font-medium text-ink transition-colors hover:text-accent"
          >
            <Avatar url={post.author.avatarUrl} size={32} />
            <span className="truncate">{post.author.name}</span>
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={postHref}
          className="shrink-0 transition-colors hover:text-accent"
        >
          {formatPostDate(post.createdAt)}
        </Link>
      </div>

      <div className={`flex gap-4 ${post.text ? "" : "items-center"}`}>
        {hero && heroArtwork && (
          <TrackArtwork
            trackId={hero.id}
            artworkUrl={heroArtwork}
            previewUrl={hero.previewUrl}
            title={hero.title}
            artist={hero.artist}
            href={postHref}
            size={128}
          />
        )}

        {/* relative z-10: пластинка выезжает вправо абсолютом и иначе легла бы поверх текста */}
        <div className="relative z-10 min-w-0 flex-1">
          {post.text && (
            <p className="prose-diary whitespace-pre-wrap text-ink">
              {excerpt(post.text)}
            </p>
          )}

          {hero && (
            <p
              className={`flex min-w-0 items-center gap-2 text-sm text-muted ${
                post.text ? "mt-3" : ""
              }`}
            >
              <span aria-hidden className="shrink-0 text-base leading-none text-accent">▸</span>
              <span className="truncate">
                <span className="font-medium text-ink">{hero.artist}</span>
                {" — "}
                {hero.title}
              </span>
            </p>
          )}
        </div>
      </div>

      {restTracks.length > 0 && (
        <div className="flex flex-col gap-2">
          {restTracks.map((postTrack) => (
            <TrackRow
              key={postTrack.id}
              track={postTrack.track}
              showPreview={false}
            />
          ))}
        </div>
      )}

      {/* Знак вместо простой линейки: та же роль разделителя, но узнаваемая.
          Разделитель есть у каждой карточки, а всплеск — через одну (showMark):
          в ленте подряд знак превращается в узор и перестаёт читаться подписью.
          Пропущенная карточка получает ровную нить, поэтому высоты не прыгают.
          -my-1 гасит часть флекс-зазора — всплеск и так занимает высоту */}
      <Groove size="sm" tone="quiet" silent={!showMark} className="-my-1" />

      <div className="flex items-center gap-4 text-sm text-muted">
        {currentUserId ? (
          <LikeButton
            postId={post.id}
            authorUsername={post.author.username}
            slug={post.slug}
            initialLiked={isLiked}
            initialCount={post._count.likes}
          />
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 transition-colors hover:text-accent"
          >
            <span aria-hidden className="text-base leading-none">
              ♡
            </span>
            {post._count.likes}
          </Link>
        )}

        <Link href={postHref} className="transition-colors hover:text-accent">
          Читать
        </Link>

        {isOwner && (
          <Link
            href={`/post/${post.id}/edit`}
            className="ml-auto transition-colors hover:text-accent"
          >
            Редактировать
          </Link>
        )}
      </div>
    </article>
  );
}
