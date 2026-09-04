import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getConversationList } from "@/lib/messages";
import { ConversationRow } from "@/components/ConversationRow";
import { RefreshOnPing } from "@/components/RefreshOnPing";

export const dynamic = "force-dynamic";

// Список диалогов — по образцу /friends: тот же shell, тот же redirect для
// анонимуса. Диалог создаётся лениво, при первой отправке, поэтому в списке
// нет "пустых" собеседников — только те, с кем реально был обмен.
export default async function MessagesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const conversations = await getConversationList(session.user.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <RefreshOnPing />

      <h1 className="font-serif text-2xl tracking-tight text-ink">Сообщения</h1>

      {conversations.length > 0 ? (
        <div className="flex flex-col gap-2">
          {conversations.map((conversation) => (
            <ConversationRow
              key={conversation.otherUser.username}
              otherUser={conversation.otherUser}
              lastMessageText={conversation.lastMessageText}
              lastMessageAt={conversation.lastMessageAt}
              lastMessageFromMe={conversation.lastMessageFromMe}
              hasUnread={conversation.hasUnread}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-serif text-lg text-ink">Здесь пока тихо</p>
          <p className="text-sm text-muted">
            Писать можно друзьям — начни со{" "}
            <Link href="/friends" className="text-accent transition-opacity hover:opacity-80">
              списка друзей
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
