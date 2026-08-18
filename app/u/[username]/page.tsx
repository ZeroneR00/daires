import type { Metadata } from "next";
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
import { getFriendshipStatus } from "@/lib/friends";
import { formatPostDate } from "@/lib/format-date";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { FriendButton } from "@/components/FriendButton";
import { ProfileStats } from "@/components/ProfileStats";

export const dynamic = "force-dynamic";

interface UserDiaryPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserDiaryPageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return {};

  return {
    title: `${user.name} — music-diary`,
    alternates: {
      types: { "application/rss+xml": `/u/${username}/rss.xml` },
    },
  };
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
  const friendCount = user._count.friendshipsA + user._count.friendshipsB;
  const [likedPostIds, followingTarget, friendshipStatus, stats] = await Promise.all([
    session
      ? getLikedPostIds(session.user.id, posts.map((post) => post.id))
      : Promise.resolve(new Set<string>()),
    session && !isOwnProfile ? isFollowing(session.user.id, user.id) : Promise.resolve(false),
    session && !isOwnProfile
      ? getFriendshipStatus(session.user.id, user.id)
      : Promise.resolve("none" as const),
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
            @{user.username}{" "}
            <Link
              href={`/u/${user.username}/rss.xml`}
              className="text-xs text-zinc-400 hover:underline dark:text-zinc-500"
            >
              RSS
            </Link>
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href={`/u/${user.username}/friends`} className="hover:underline">
              {friendCount} друзей
            </Link>{" "}
            · {user._count.followers} подписчиков · {user._count.following} подписок
          </p>
          {user.bio && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {user.bio}
            </p>
          )}
        </div>
        {!isOwnProfile &&
          (session ? (
            <div className="flex flex-col items-end gap-2">
              <FollowButton
                targetUsername={user.username}
                initialFollowing={followingTarget}
                initialFollowerCount={user._count.followers}
              />
              <FriendButton targetUsername={user.username} initialStatus={friendshipStatus} />
            </div>
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
