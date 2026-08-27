import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getFeedPosts, getLikedPostIds } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { HomeHero } from "@/components/HomeHero";
import { Groove } from "@/components/Groove";
import { artworkAtSize } from "@/lib/artwork";

export const dynamic = "force-dynamic";

const cardClassName = "rounded-card border border-line bg-surface p-6";

export default async function Home() {
  const [session, posts] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getFeedPosts(),
  ]);
  const likedPostIds = session
    ? await getLikedPostIds(
        session.user.id,
        posts.map((post) => post.id),
      )
    : new Set<string>();

  // Стена на первом экране собирается из обложек самой ленты — отдельного
  // запроса не нужно, посты уже загружены выше.
  const artworks = Array.from(
    new Set(
      posts
        .flatMap((post) => post.tracks.map((t) => t.track.artworkUrl))
        .map((url) => artworkAtSize(url, 200))
        .filter((url): url is string => url !== null),
    ),
  );
  const authorCount = new Set(posts.map((post) => post.authorId)).size;

  return (
    <>
      {!session && (
        <HomeHero
          artworks={artworks}
          postCount={posts.length}
          authorCount={authorCount}
        />
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:flex-row sm:px-6">
      <main className="flex flex-1 flex-col gap-6">
        {session ? (
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-3xl tracking-tight text-ink">
              Привет, {session.user.username}
            </h1>
            <p className="text-sm text-muted">
              Что звучало у тебя сегодня?
            </p>
          </div>
        ) : null}

        {posts.length > 0 ? (
          <div className="flex flex-col gap-4">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={session?.user.id}
                isLiked={likedPostIds.has(post.id)}
                showMark={index % 2 === 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
            <p className="font-serif text-lg text-ink">Здесь пока тихо</p>
            <p className="text-sm text-muted">
              Лента оживёт, когда появится первая запись.
            </p>
          </div>
        )}

        {/* Знак закрывает ленту: «записи кончились», а не обрыв в пустоту */}
        <Groove className="pt-2" />
      </main>

      <aside className="flex w-full shrink-0 flex-col gap-4 sm:w-72">
        <div className={cardClassName}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            О чём это
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            music-diary — платформа для музыкальных дневников. Каждый пост —
            это личный текст и прикреплённый трек.
          </p>
        </div>

        <div className={cardClassName}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            Как это работает
          </h2>
          <ol className="mt-3 flex flex-col gap-3 text-sm text-ink">
            <li className="flex gap-3">
              <span className="font-serif text-accent">1</span>
              Заведи дневник
            </li>
            <li className="flex gap-3">
              <span className="font-serif text-accent">2</span>
              Найди трек, который слушаешь
            </li>
            <li className="flex gap-3">
              <span className="font-serif text-accent">3</span>
              Напиши, что он с тобой сделал
            </li>
          </ol>
        </div>
      </aside>
    </div>
    </>
  );
}
