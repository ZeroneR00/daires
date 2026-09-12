"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePair } from "@/lib/friends";
import { messageInputSchema } from "@/lib/message-schema";
import { notifyUser } from "@/lib/realtime";

// Мутации живут в lib/, а не в actions.ts одного роута: зовутся минимум с трёх
// мест (страница диалога, список диалогов, кнопка на профиле) — та же причина,
// что у lib/friend-actions.ts и lib/like-actions.ts.

// Диалог с собеседником лежит по РАЗНЫМ адресам у разных сторон: у меня это
// /messages/<он>, у него — /messages/<я>. Ревалидировать надо оба.
function revalidateMessagePaths(myUsername: string, otherUsername: string) {
  revalidatePath("/messages");
  revalidatePath(`/messages/${otherUsername}`);
  revalidatePath(`/messages/${myUsername}`);
}

export async function sendMessage(
  targetUsername: string,
  text: string,
): Promise<{ error: string } | { ok: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы писать сообщения" };
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) {
    return { error: "Пользователь не найден" };
  }

  const myId = session.user.id;
  if (target.id === myId) {
    return { error: "Нельзя написать самому себе" };
  }

  const [userAId, userBId] = normalizePair(myId, target.id);

  // Гард дружбы — на уровне экшена, а не сокрытием кнопки в UI: "use server" —
  // это публичный POST-эндпоинт, до него можно достучаться мимо интерфейса.
  // Тот же аргумент, что в sendFriendRequest.
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!friendship) {
    return { error: "Писать можно только друзьям" };
  }

  const parsed = messageInputSchema.safeParse({ text });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const iAmUserA = userAId === myId;
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Диалог создаётся лениво, при первой отправке — иначе каждый заход на
      // страницу чата плодил бы пустые строки. Своя метка чтения двигается
      // вместе с отправкой: своё сообщение прочитано мной сразу.
      const conversation = await tx.conversation.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: {
          userAId,
          userBId,
          lastMessageAt: now,
          userALastReadAt: iAmUserA ? now : null,
          userBLastReadAt: iAmUserA ? null : now,
        },
        update: {
          lastMessageAt: now,
          ...(iAmUserA ? { userALastReadAt: now } : { userBLastReadAt: now }),
        },
      });

      await tx.message.create({
        data: { conversationId: conversation.id, senderId: myId, text: parsed.data.text },
      });
    });
  } catch {
    return { error: "Не удалось отправить сообщение, попробуй ещё раз" };
  }

  // Строго ПОСЛЕ транзакции и в try/catch: сообщение уже в базе, и упавший
  // звонок не должен превращать успешную отправку в ошибку. Худшее, что даёт
  // сбой здесь — собеседник увидит сообщение при следующей навигации.
  try {
    await notifyUser(target.id);
  } catch {
    // Намеренно молча: доставка пинга второстепенна.
  }

  revalidateMessagePaths(session.user.username, targetUsername);
  return { ok: true };
}

// updateMany, а не update: ноль строк — штатный исход (диалога ещё нет, человек
// просто открыл пустой чат), update кинул бы исключение. Та же причина, что у
// ignoreFriendRequest.
export async function markConversationRead(
  otherUsername: string,
): Promise<{ error: string } | { ok: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти" };
  }

  const other = await prisma.user.findUnique({
    where: { username: otherUsername },
    select: { id: true },
  });
  if (!other) {
    return { error: "Пользователь не найден" };
  }

  const myId = session.user.id;
  const [userAId, userBId] = normalizePair(myId, other.id);
  const now = new Date();

  try {
    await prisma.conversation.updateMany({
      where: { userAId, userBId },
      data: userAId === myId ? { userALastReadAt: now } : { userBLastReadAt: now },
    });
  } catch {
    return { error: "Не удалось отметить диалог прочитанным" };
  }

  revalidateMessagePaths(session.user.username, otherUsername);
  return { ok: true };
}
