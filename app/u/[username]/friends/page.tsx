import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserByUsername } from "@/lib/posts";
import { getFriends } from "@/lib/friends";
import { UserResultRow } from "@/components/UserResultRow";

export const dynamic = "force-dynamic";

interface UserFriendsPageProps {
  params: Promise<{ username: string }>;
}

export default async function UserFriendsPage({ params }: UserFriendsPageProps) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) notFound();

  const friends = await getFriends(user.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <Link
        href={`/u/${user.username}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← В дневник
      </Link>

      <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Друзья {user.name}
      </h1>

      {friends.length > 0 ? (
        <div className="flex flex-col gap-2">
          {friends.map((friend) => (
            <UserResultRow key={friend.username} user={friend} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/[.15] p-6 text-center dark:border-white/[.2]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Друзей пока нет.</p>
        </div>
      )}
    </div>
  );
}
