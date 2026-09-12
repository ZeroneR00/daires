import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserByUsername } from "@/lib/posts";
import { getFriendshipStatus } from "@/lib/friends";
import { getConversationWith, getMessages } from "@/lib/messages";
import { Avatar } from "@/components/Avatar";
import { MessageList } from "@/components/MessageList";
import { MessageForm } from "@/components/MessageForm";
import { MarkReadOnOpen } from "@/components/MarkReadOnOpen";
import { RefreshOnPing } from "@/components/RefreshOnPing";

export const dynamic = "force-dynamic";

interface ConversationPageProps {
  params: Promise<{ username: string }>;
}

// Маршрут по username, а не по conversationId: ссылку с профиля тогда можно
// собрать без похода в базу, а самого диалога может ещё не существовать —
// он создаётся при первой отправке.
export default async function ConversationPage({ params }: ConversationPageProps) {
  const { username } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const other = await getUserByUsername(username);
  if (!other || other.id === session.user.id) notFound();

  // Гард дружбы дублирует такой же гард внутри sendMessage — как с владением
  // постом: страница прячет чужой чат, экшен не даёт написать в обход UI.
  const status = await getFriendshipStatus(session.user.id, other.id);
  if (status !== "friends") notFound();

  const conversation = await getConversationWith(session.user.id, other.id);
  const messages = conversation ? await getMessages(conversation.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <RefreshOnPing />
      <MarkReadOnOpen otherUsername={other.username} />

      <Link
        href="/messages"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← Все диалоги
      </Link>

      {/*
        Собеседник — заголовок этой страницы, а не карточка в ней: своего h1
        у диалога нет, и коробка вокруг имени спорила бы с пузырями переписки
        (тот же ход, что сделал из шапки дневника титульный лист). Отделяет
        его волосяная линейка, а не рамка.
      */}
      <Link
        href={`/u/${other.username}`}
        className="group flex items-center gap-3 border-b border-line pb-5"
      >
        <Avatar url={other.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="truncate font-serif text-xl tracking-tight text-ink transition-colors group-hover:text-accent">
            {other.name}
          </p>
          <p className="truncate text-sm text-muted">@{other.username}</p>
        </div>
      </Link>

      <MessageList messages={messages} currentUserId={session.user.id} />

      <MessageForm targetUsername={other.username} />
    </div>
  );
}
