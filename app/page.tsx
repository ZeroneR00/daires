import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getFeedPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";

const cardClassName =
  "rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black";

export default async function Home() {
  const [session, posts] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getFeedPosts(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 bg-zinc-50 px-4 py-12 font-sans dark:bg-black sm:flex-row sm:px-6">
      <main className="flex flex-1 flex-col gap-6">
        <div className={cardClassName}>
          {session ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
                Привет, {session.user.username}!
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Рады видеть тебя снова.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
                Добро пожаловать в music-diary
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Веди свой музыкальный дневник: пиши о треках, которые слушаешь,
                и делись впечатлениями.
              </p>
              <div className="mt-4 flex gap-3 text-sm font-medium">
                <Link
                  href="/signup"
                  className="flex h-10 items-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                >
                  Зарегистрироваться
                </Link>
                <Link
                  href="/login"
                  className="flex h-10 items-center rounded-full border border-black/[.08] px-5 text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
                >
                  Войти
                </Link>
              </div>
            </>
          )}
        </div>

        {posts.length > 0 ? (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/[.15] p-6 text-center dark:border-white/[.2]">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Лента постов появится здесь, когда кто-то опубликует первый трек.
            </p>
          </div>
        )}
      </main>

      <aside className="flex w-full shrink-0 flex-col gap-6 sm:w-72">
        <div className={cardClassName}>
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
            О чём этот сайт
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            music-diary — платформа для музыкальных дневников. Каждый пост —
            это личный текст и прикреплённый трек.
          </p>
        </div>

        <div className={cardClassName}>
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
            Как это работает
          </h2>
          <ol className="mt-2 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>1. Зарегистрируйся</li>
            <li>2. Найди трек, который слушаешь</li>
            <li>3. Напиши пост с впечатлениями</li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
