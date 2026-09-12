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

/*
  Подписи секций — тихими капсами, а не заголовками: секций на странице до
  четырёх подряд, и набранные как h2 они спорили бы и друг с другом, и с самим
  «Друзья». Тот же приём, что у блоков сайдбара на главной.
*/
const sectionTitleClassName = "text-xs font-semibold uppercase tracking-widest text-muted";

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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <h1 className="font-serif text-2xl tracking-tight text-ink">Друзья</h1>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClassName}>Заявки в друзья</h2>
          <div className="flex flex-col gap-2">
            {incoming.map((request) => (
              <IncomingRequestRow key={request.id} requester={request.sender} />
            ))}
          </div>
        </section>
      )}

      {deferred.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClassName}>Отложенные заявки</h2>
          <div className="flex flex-col gap-2">
            {deferred.map((request) => (
              <IncomingRequestRow key={request.id} requester={request.sender} deferred />
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClassName}>Исходящие заявки</h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((request) => (
              <OutgoingRequestRow key={request.id} target={request.receiver} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitleClassName}>Мои друзья</h2>
        {friends.length > 0 ? (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => (
              <UserResultRow key={friend.username} user={friend} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
            <p className="font-serif text-lg text-ink">Здесь пока пусто</p>
            <p className="text-sm text-muted">
              Друзей ещё нет. Загляни в чей-нибудь дневник и отправь заявку.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
