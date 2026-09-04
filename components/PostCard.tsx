import Link from "next/link";
import { formatPostDate, formatPostDateParts } from "@/lib/format-date";
import { artworkAtSize } from "@/lib/artwork";
import { PostTrackList } from "@/components/PostTrackList";
import { Avatar } from "@/components/Avatar";
import { TrackArtwork } from "@/components/TrackArtwork";
import { Groove } from "@/components/Groove";
import { LikeButton } from "@/components/LikeButton";
import { buildQueue } from "@/lib/track-queue";
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
  const dateLabel = formatPostDate(post.createdAt);
  const dateIso = post.createdAt.toISOString();
  const { day, month, year } = formatPostDateParts(post.createdAt);

  // Первый трек играет роль обложки записи, но из списка ниже не выпадает:
  // иначе включить его отдельно было бы неоткуда.
  const hero = post.tracks[0]?.track;
  // Очередь собирается один раз на карточку и уходит и герою, и списку:
  // запись играет альбомом, с какой дорожки её ни запусти.
  const queue = buildQueue(post.tracks);
  const heroArtwork = artworkAtSize(hero?.artworkUrl ?? null, 300);

  return (
    <article
      className="glow-card relative flex overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-accent/40"
      style={{ "--glow": heroArtwork ? `url(${heroArtwork})` : "none" } as React.CSSProperties}
    >
      {/*
        Поле тетради у самой записи: дата стоит столбиком слева от волосяной
        линии — тем же токеном --rule-margin, которым начерчено поле страницы,
        поэтому одно читается продолжением другого. Включается только с lg:
        на sm лента ужата сайдбаром до ~270 px, и колонка съела бы текст.
        Ниже этого порога дата остаётся в шапке карточки (ссылка с lg:hidden).
      */}
      <Link
        href={postHref}
        aria-label={dateLabel}
        className="group hidden w-14 shrink-0 flex-col items-center justify-start gap-1 border-r border-rule-margin py-5 font-serif leading-none text-muted transition-colors hover:text-accent lg:flex"
      >
        <time dateTime={dateIso} className="flex flex-col items-center gap-1">
          <span className="text-lg text-ink transition-colors group-hover:text-accent">
            {day}
          </span>
          <span className="text-[11px] uppercase tracking-wider">{month}</span>
          {year && <span className="text-[11px] opacity-70">{year}</span>}
        </time>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        {/* Без автора шапка на широком экране состояла бы из одной уехавшей
            в поле даты — тогда её незачем и рендерить. */}
        <div
          className={`flex items-center justify-between gap-3 text-sm text-muted ${
            showAuthor ? "" : "lg:hidden"
          }`}
        >
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
            className="shrink-0 transition-colors hover:text-accent lg:hidden"
          >
            <time dateTime={dateIso}>{dateLabel}</time>
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
              queue={queue}
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

        <PostTrackList
          tracks={post.tracks.map((postTrack) => postTrack.track)}
          queue={queue}
        />

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
      </div>
    </article>
  );
}
