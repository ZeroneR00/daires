import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDeferredFriendRequests,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
} from "@/lib/friends";
import { UserResultRow } from "@/components/UserResultRow";
import { IncomingRequestRow } from "@/components/IncomingRequestRow";
import { OutgoingRequestRow } from "@/components/OutgoingRequestRow";

export const dynamic = "force-dynamic";

export default async function FriendsHubPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [incoming, deferred, outgoing, friends] = await Promise.all([
    getIncomingFriendRequests(session.user.id),
    getDeferredFriendRequests(session.user.id),
    getOutgoingFriendRequests(session.user.id),
    getFriends(session.user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Друзья
      </h1>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Заявки в друзья
          </h2>
          <div className="flex flex-col gap-2">
            {incoming.map((request) => (
              <IncomingRequestRow key={request.id} requester={request.sender} />
            ))}
          </div>
        </section>
      )}

      {deferred.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Отложенные заявки
          </h2>
          <div className="flex flex-col gap-2">
            {deferred.map((request) => (
              <IncomingRequestRow key={request.id} requester={request.sender} deferred />
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Исходящие заявки
          </h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((request) => (
              <OutgoingRequestRow key={request.id} target={request.receiver} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Мои друзья</h2>
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
      </section>
    </div>
  );
}
