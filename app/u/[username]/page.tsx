import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostsByUsername, getUserByUsername } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← На главную
      </Link>

      <div className="flex items-center gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full"
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {user.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            @{user.username}
          </p>
          {user.bio && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showAuthor={false}
              currentUserId={session?.user.id}
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
