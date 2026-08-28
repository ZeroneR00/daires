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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href={`/u/${user.username}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← В дневник
      </Link>

      <h1 className="font-serif text-2xl tracking-tight text-ink">
        Друзья {user.name}
      </h1>

      {friends.length > 0 ? (
        <div className="flex flex-col gap-2">
          {friends.map((friend) => (
            <UserResultRow key={friend.username} user={friend} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-serif text-lg text-ink">Здесь пока пусто</p>
          <p className="text-sm text-muted">Друзей ещё нет.</p>
        </div>
      )}
    </div>
  );
}
