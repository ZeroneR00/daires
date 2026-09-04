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
import { pillButton } from "@/lib/ui";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Groove } from "@/components/Groove";
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← На главную
      </Link>

      {/*
        Титульный лист, а не карточка: карточки на этой странице принадлежат
        записям, и автор в такой же коробке спорил бы с ними за внимание.
        Имя лежит прямо на бумаге — линовка фона видна вокруг него.
      */}
      <header className="flex flex-col gap-5">
        <div className="flex items-start gap-4 sm:gap-5">
          <Avatar url={user.avatarUrl} size={80} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="font-serif text-3xl leading-tight tracking-tight text-ink">
              {user.name}
            </h1>
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
              <span className="truncate">@{user.username}</span>
              <Link
                href={`/u/${user.username}/rss.xml`}
                className="text-xs tracking-wide transition-colors hover:text-accent"
              >
                RSS
              </Link>
            </p>
            <p className="text-sm text-muted">
              <Link
                href={`/u/${user.username}/friends`}
                className="transition-colors hover:text-accent"
              >
                {friendCount} друзей
              </Link>
              {" · "}
              {user._count.followers} подписчиков
              {" · "}
              {user._count.following} подписок
            </p>
          </div>
        </div>

        {/* Bio — то немногое на странице, что автор написал о себе, поэтому
            антиквой. Но не .prose-diary: тот класс закреплён за текстом
            записей, и размывать его на подписи не стоит */}
        {user.bio && (
          <p className="max-w-xl font-serif text-base leading-relaxed text-ink">
            {user.bio}
          </p>
        )}

        {!isOwnProfile &&
          (session ? (
            /* Кнопки переехали из правого столбца в строку под именем: на
               узком экране столбец из трёх «таблеток» сдавливал имя автора
               в пару символов */
            <div className="flex flex-wrap items-center gap-2">
              <FollowButton
                targetUsername={user.username}
                initialFollowing={followingTarget}
                initialFollowerCount={user._count.followers}
              />
              <FriendButton targetUsername={user.username} initialStatus={friendshipStatus} />
              {/* Кнопка появляется только у друзей — это же условие
                  продублировано гардом внутри sendMessage: "use server" —
                  публичный эндпоинт, на сокрытие в UI полагаться нельзя. */}
              {friendshipStatus === "friends" && (
                <Link href={`/messages/${user.username}`} className={pillButton}>
                  Написать
                </Link>
              )}
            </div>
          ) : (
            <Link href="/login" className={`${pillButton} w-fit`}>
              Подписаться
            </Link>
          ))}
      </header>

      <ProfileStats stats={stats} memberSince={formatPostDate(user.createdAt)} />

      {/* Единственный знак страницы: граница между визиткой автора и его
          записями. Дальше идёт та же лента, что на главной, и знаки в ней
          уже чередуются сами */}
      <Groove />

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              showAuthor={false}
              currentUserId={session?.user.id}
              isLiked={likedPostIds.has(post.id)}
              showMark={index % 2 === 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-serif text-lg text-ink">Пока тишина</p>
          <p className="text-sm text-muted">
            {isOwnProfile
              ? "Твоя первая запись появится здесь."
              : "Автор ещё не сделал ни одной записи."}
          </p>
        </div>
      )}
    </div>
  );
}
