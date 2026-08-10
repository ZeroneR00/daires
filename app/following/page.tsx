import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFollowingFeedPosts, getLikedPostIds } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function FollowingFeedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const posts = await getFollowingFeedPosts(session.user.id);
  const likedPostIds = await getLikedPostIds(session.user.id, posts.map((post) => post.id));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Моя лента
      </h1>

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session.user.id}
              isLiked={likedPostIds.has(post.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/[.15] p-6 text-center dark:border-white/[.2]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Пока не подписан(а) ни на кого. Загляни в чей-нибудь дневник и подпишись.
          </p>
          <Link href="/" className="mt-3 text-sm font-medium hover:underline">
            Открыть общую ленту
          </Link>
        </div>
      )}
    </div>
  );
}
