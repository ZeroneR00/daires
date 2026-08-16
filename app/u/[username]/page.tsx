import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getPostsByUsername,
  getUserByUsername,
  getLikedPostIds,
  isFollowing,
} from "@/lib/posts";
import { getProfileStats } from "@/lib/stats";
import { formatPostDate } from "@/lib/format-date";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { ProfileStats } from "@/components/ProfileStats";

export const dynamic = "force-dynamic";

interface UserDiaryPageProps {
  params: Promise<{ username: string }>;
}

export default async function UserDiaryPage({ params }: UserDiaryPageProps) {
  const { username } = await params;
  const [session, user, posts] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getUserByUsername(username),
    getPostsByUsername(username),
  ]);

  if (!user) notFound();

  const isOwnProfile = session?.user.id === user.id;
  const [likedPostIds, followingTarget, stats] = await Promise.all([
    session
      ? getLikedPostIds(session.user.id, posts.map((post) => post.id))
      : Promise.resolve(new Set<string>()),
    session && !isOwnProfile ? isFollowing(session.user.id, user.id) : Promise.resolve(false),
    getProfileStats(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← На главную
      </Link>

      <div className="flex items-center gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        <Avatar url={user.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {user.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            @{user.username}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {user._count.followers} подписчиков · {user._count.following} подписок
          </p>
          {user.bio && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {user.bio}
            </p>
          )}
        </div>
        {!isOwnProfile &&
          (session ? (
            <FollowButton
              targetUsername={user.username}
              initialFollowing={followingTarget}
              initialFollowerCount={user._count.followers}
            />
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center rounded-full border border-black/[.08] px-4 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
            >
              Подписаться
            </Link>
          ))}
      </div>

      <ProfileStats stats={stats} memberSince={formatPostDate(user.createdAt)} />

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showAuthor={false}
              currentUserId={session?.user.id}
              isLiked={likedPostIds.has(post.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/[.15] p-6 text-center dark:border-white/[.2]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Пока нет ни одной записи.
          </p>
        </div>
      )}
    </div>
  );
}
