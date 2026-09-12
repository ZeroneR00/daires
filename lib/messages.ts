import { prisma } from "@/lib/prisma";
import { normalizePair } from "@/lib/friends";

const userSelect = { select: { username: true, name: true, avatarUrl: true } };

export interface ConversationSummary {
  otherUser: { username: string; name: string; avatarUrl: string | null };
  lastMessageText: string | null;
  lastMessageAt: Date;
  lastMessageFromMe: boolean;
  hasUnread: boolean;
}

// Список диалогов для /messages. Сортировка идёт по денормализованному
// lastMessageAt — иначе "свежие сверху" потребовало бы подзапроса за последним
// сообщением каждого диалога.
export async function getConversationList(userId: string): Promise<ConversationSummary[]> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: userSelect,
      userB: userSelect,
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return conversations.map((conversation) => {
    // Собеседник выбирается тем же приёмом, что в getFriends: строка одна
    // на пару, "я" может оказаться любой из сторон.
    const iAmUserA = conversation.userAId === userId;
    const otherUser = iAmUserA ? conversation.userB : conversation.userA;
    const myLastReadAt = iAmUserA
      ? conversation.userALastReadAt
      : conversation.userBLastReadAt;
    const lastMessage = conversation.messages.at(0) ?? null;

    return {
      otherUser,
      lastMessageText: lastMessage?.text ?? null,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageFromMe: lastMessage?.senderId === userId,
      // Бейдж булевый, а не число: точное количество на каждый диалог требует
      // своего порога сравнения на строку, то есть запроса на диалог. "Есть ли
      // новое" считается бесплатно из уже загруженных данных.
      hasUnread:
        lastMessage !== null &&
        lastMessage.senderId !== userId &&
        (myLastReadAt === null || lastMessage.createdAt > myLastReadAt),
    };
  });
}

// Может вернуть null: диалог создаётся лениво, при первой отправке.
export function getConversationWith(myId: string, otherId: string) {
  const [userAId, userBId] = normalizePair(myId, otherId);
  return prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
}

export function getMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    include: { sender: userSelect },
    orderBy: { createdAt: "asc" },
  });
}

// Два запроса вместо одного намеренно: моя метка чтения лежит в Conversation,
// а сравнивать надо с Message.createdAt — Prisma не умеет сопоставить поле
// модели с полем связанной модели одним where. Раскладывать это в raw SQL ради
// счётчика в шапке пока не за что.
export async function getUnreadCount(userId: string): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { id: true, userAId: true, userALastReadAt: true, userBLastReadAt: true },
  });

  if (conversations.length === 0) return 0;

  const unreadInConversation = conversations.map((conversation) => {
    const myLastReadAt =
      conversation.userAId === userId
        ? conversation.userALastReadAt
        : conversation.userBLastReadAt;

    // null — ни разу не открывал, значит непрочитано всё.
    return myLastReadAt === null
      ? { conversationId: conversation.id }
      : { conversationId: conversation.id, createdAt: { gt: myLastReadAt } };
  });

  return prisma.message.count({
    where: { senderId: { not: userId }, OR: unreadInConversation },
  });
}
