import Link from "next/link";
import { formatPostDate, formatPostDateParts, toDayKey } from "@/lib/format-date";
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

  /*
    Дата ведёт не в запись, а в её день: в саму запись отсюда и так три пути
    (обложка, название, «Читать»), а четвёртый ничего не добавлял.

    Охват дня решает контекст страницы, и он уже выражен пропом showAuthor:
    false стоит ровно там, где страница и так про одного автора — в его
    дневнике. Отдельный проп «охват дня» пришлось бы выставлять всегда вместе
    с этим, а два пропа, обязанные совпадать, однажды разойдутся.
  */
  const dayKey = toDayKey(post.createdAt);
  const dayHref = showAuthor
    ? `/day/${dayKey}`
    : `/day/${dayKey}?u=${encodeURIComponent(post.author.username)}`;

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
        href={dayHref}
        aria-label={`Записи за ${dateLabel}`}
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

      {/*
        min-w-0 здесь не украшение, и дальше по дереву он повторяется не зря:
        truncate — это nowrap, и обрезанный многоточием текст всё равно требует
        у родителя свою полную ширину как min-content. Флекс-элемент без min-w-0
        ниже неё не сжимается и выталкивает соседа — на длинных названиях треков
        страницу распирало вбок. Truncate держит ширину только там, где min-w-0
        стоит у КАЖДОГО флекс-предка; само по себе оно не держит.
      */}
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
            href={dayHref}
            aria-label={`Записи за ${dateLabel}`}
            className="shrink-0 transition-colors hover:text-accent lg:hidden"
          >
            <time dateTime={dateIso}>{dateLabel}</time>
          </Link>
        </div>

        {/*
          Ниже lg текст обтекает обложку, как в журнале, и под ней уходит на
          всю ширину. Колонкой рядом с обложкой на телефоне оставалось ~130 px
          — две-три слова в строке. Обтекание — это float, а не flex: flex
          ставит блоки рядом, но переносить строки под соседа не умеет.

          Один набор классов на оба режима: внутри flex-контейнера (lg и шире)
          float браузер игнорирует сам, так что обложке достаточно float-left
          и снятых на lg отступов. flow-root держит float внутри блока — без
          него список дорожек ниже подтягивался бы вверх, под короткий текст.

          Запись без текста не обтекается: она центрируется по обложке, и
          подпись трека рядом — её единственное содержимое, а не дубль.
        */}
        <div
          className={
            // mb-2: подпись-дубль ниже lg ушла, и конец текста отделяется от
            // списка дорожек воздухом, а не новым элементом
            post.text
              ? "mb-2 flow-root lg:mb-0 lg:flex lg:gap-4"
              : "flex items-center gap-4"
          }
        >
          {hero && heroArtwork && (
            <div className={post.text ? "float-left mr-4 mb-2 lg:m-0" : "contents"}>
              <TrackArtwork
                trackId={hero.id}
                artworkUrl={heroArtwork}
                previewUrl={hero.previewUrl}
                title={hero.title}
                artist={hero.artist}
                href={postHref}
                size={128}
                queue={queue}
                vinylFrom={post.text ? "lg" : "base"}
              />
            </div>
          )}

          {/*
            lg:relative lg:z-10 — пластинка выезжает вправо абсолютом и иначе
            легла бы поверх текста. Ниже lg слоя быть не должно: при обтекании
            этот прозрачный блок лежит на всю ширину, в том числе под обложкой,
            и с z-10 перекрыл бы её — обложка перестала бы нажиматься. Пластинка
            там не выезжает, так что закрываться не от чего.
          */}
          <div className="min-w-0 flex-1 lg:relative lg:z-10">
            {post.text && (
              <p className="prose-diary whitespace-pre-wrap text-ink">
                {excerpt(post.text)}
              </p>
            )}

            {/* Под обтекающим текстом подпись повторяла бы первую строку
                списка дорожек, стоящего сразу за ней, — и текст казался бы
                не кончившимся, а перетёкшим в треки. Поэтому ниже lg она есть
                только у записи без текста. */}
            {hero && (
              <p
                className={`min-w-0 items-center gap-2 text-sm text-muted ${
                  post.text ? "mt-3 hidden lg:flex" : "flex"
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
