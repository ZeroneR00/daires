import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFollowingFeedPosts, getLikedPostIds } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { Groove } from "@/components/Groove";

export const dynamic = "force-dynamic";

export default async function FollowingFeedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const posts = await getFollowingFeedPosts(session.user.id);
  const likedPostIds = await getLikedPostIds(session.user.id, posts.map((post) => post.id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Моя лента</h1>
        <p className="text-sm text-muted">Записи тех, на кого ты подписан(а).</p>
      </header>

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/*
            Чередование знака — свойство списка, а не карточки (по умолчанию
            showMark = true). Без этой строки знак стоял бы под каждой записью
            подряд: ровно та ошибка, которую заход A поймал на дневнике автора.
          */}
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session.user.id}
              isLiked={likedPostIds.has(post.id)}
              showMark={index % 2 === 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-serif text-lg text-ink">Здесь пока тихо</p>
          <p className="text-sm text-muted">
            Пока не подписан(а) ни на кого. Загляни в чей-нибудь дневник и подпишись.
          </p>
          <Link
            href="/"
            className="mt-3 text-sm font-medium text-accent transition-opacity hover:opacity-80"
          >
            Открыть общую ленту
          </Link>
        </div>
      )}

      {/* Тот же знак, что закрывает главную: это вторая лента сайта, а не другой экран */}
      <Groove className="pt-2" />
    </div>
  );
}
