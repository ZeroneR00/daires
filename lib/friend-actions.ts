"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePair, type FriendshipStatus } from "@/lib/friends";

// Заявка между двумя людьми может лежать в базе в двух направлениях сразу:
// если A и B нажали "Добавить в друзья" одновременно, оба прочитали пустую
// встречную заявку и оба создали свою. Всё, что закрывает вопрос дружбы
// (принятие с любой стороны), обязано убрать оба направления — иначе
// оставшаяся строка становится вечной входящей заявкой от уже состоявшегося
// друга: "Принять" по ней падает об unique на Friendship, а счётчик в шапке
// залипает. Условие живёт здесь одной копией, как порядок пары в normalizePair.
function pairRequests(oneId: string, otherId: string) {
  return {
    OR: [
      { senderId: oneId, receiverId: otherId },
      { senderId: otherId, receiverId: oneId },
    ],
  };
}

function revalidateFriendPaths(myUsername: string, targetUsername: string) {
  revalidatePath(`/u/${myUsername}`);
  revalidatePath(`/u/${targetUsername}`);
  revalidatePath(`/u/${myUsername}/friends`);
  revalidatePath(`/u/${targetUsername}/friends`);
  revalidatePath("/friends");
}

export async function sendFriendRequest(
  targetUsername: string,
): Promise<{ error: string } | { status: FriendshipStatus }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы добавлять в друзья" };
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) {
    return { error: "Пользователь не найден" };
  }
  if (target.id === session.user.id) {
    return { error: "Нельзя добавить себя в друзья" };
  }

  const myId = session.user.id;
  const [pairAId, pairBId] = normalizePair(myId, target.id);

  // Гард на уровне экшена, а не сокрытием кнопки в UI (та же причина, что у
  // self-follow): "use server"-функция — публичный POST-эндпоинт, и вызов при
  // уже существующей дружбе создал бы заявку от человека, который и так друг.
  // Такая заявка потом неубиваема через "Принять" — friendship.create бьётся
  // об unique, — и залипает счётчиком в шапке. Возврат status, а не error:
  // цель вызывающего достигнута, а error откатил бы useOptimistic в
  // FriendButton к "Добавить в друзья", т.е. соврал бы сильнее.
  const existingFriendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: pairAId, userBId: pairBId } },
  });
  if (existingFriendship) {
    return { status: "friends" };
  }

  // Встречная заявка (B уже позвал A, пока A звал B) — сразу дружба,
  // без "обе заявки висят, никто не жал Принять".
  const reverseRequest = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId: target.id, receiverId: myId } },
  });

  let status: FriendshipStatus;
  try {
    if (reverseRequest) {
      await prisma.$transaction([
        // deleteMany по обоим направлениям, а не delete по id встречной: если
        // обе строки уже есть (см. гонку в acceptFriendRequest), своя пережила
        // бы создание дружбы и залипла фантомной заявкой.
        prisma.friendRequest.deleteMany({ where: pairRequests(myId, target.id) }),
        prisma.friendship.create({ data: { userAId: pairAId, userBId: pairBId } }),
      ]);
      status = "friends";
    } else {
      await prisma.friendRequest.create({ data: { senderId: myId, receiverId: target.id } });
      status = "pending_outgoing";
    }
  } catch {
    return { error: "Не удалось отправить заявку, попробуй ещё раз" };
  }

  revalidateFriendPaths(session.user.username, targetUsername);
  return { status };
}

export async function cancelFriendRequest(
  targetUsername: string,
): Promise<{ error: string } | { status: FriendshipStatus }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти" };
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) {
    return { error: "Пользователь не найден" };
  }

  try {
    // deleteMany, а не delete: ноль строк здесь — штатный исход, а не ошибка
    // (двойной клик, или адресат успел принять/отклонить раньше). Цель
    // вызывающего "моей заявки нет" в этом случае уже достигнута, ругаться
    // не на что. Та же причина, что у updateMany в ignoreFriendRequest.
    // Направление одно: отмена своей исходящей не должна заодно стирать
    // входящую от этого же человека — это отдельное действие "Отклонить".
    await prisma.friendRequest.deleteMany({
      where: { senderId: session.user.id, receiverId: target.id },
    });
  } catch {
    return { error: "Не удалось отменить заявку, попробуй ещё раз" };
  }

  revalidateFriendPaths(session.user.username, targetUsername);
  return { status: "none" };
}

export async function acceptFriendRequest(
  requesterUsername: string,
): Promise<{ error: string } | { status: FriendshipStatus }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти" };
  }

  const requester = await prisma.user.findUnique({
    where: { username: requesterUsername },
    select: { id: true },
  });
  if (!requester) {
    return { error: "Пользователь не найден" };
  }

  const myId = session.user.id;
  const [userAId, userBId] = normalizePair(myId, requester.id);

  try {
    await prisma.$transaction([
      // Обе стороны пары, см. pairRequests. deleteMany не кидает на нуле строк,
      // так что от повторного принятия защищает только unique на Friendship —
      // она и отработает, откатив транзакцию целиком. Это осознанно: нам важнее
      // не оставить висящую заявку, чем поймать двойной клик именно здесь.
      prisma.friendRequest.deleteMany({ where: pairRequests(requester.id, myId) }),
      prisma.friendship.create({ data: { userAId, userBId } }),
    ]);
  } catch {
    return { error: "Не удалось принять заявку, попробуй ещё раз" };
  }

  revalidateFriendPaths(session.user.username, requesterUsername);
  return { status: "friends" };
}

export async function declineFriendRequest(
  requesterUsername: string,
): Promise<{ error: string } | { status: FriendshipStatus }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти" };
  }

  const requester = await prisma.user.findUnique({
    where: { username: requesterUsername },
    select: { id: true },
  });
  if (!requester) {
    return { error: "Пользователь не найден" };
  }

  try {
    // deleteMany по той же причине, что в cancelFriendRequest: повторный клик
    // или уже отменённая отправителем заявка — не ошибка. Направление одно:
    // отклоняем только входящую, свою исходящую к этому человеку не трогаем.
    await prisma.friendRequest.deleteMany({
      where: { senderId: requester.id, receiverId: session.user.id },
    });
  } catch {
    return { error: "Не удалось отклонить заявку, попробуй ещё раз" };
  }

  revalidateFriendPaths(session.user.username, requesterUsername);
  return { status: "none" };
}

// "Позже" — не ответ на заявку, а способ её не давать: заявка остаётся жива и
// видна в отдельной секции /friends, но перестаёт попадать в счётчик и в тост.
// updateMany, а не update: повторный клик по уже отложенной (или отменённой
// отправителем) заявке — штатная ситуация, а не ошибка для пользователя.
export async function ignoreFriendRequest(
  requesterUsername: string,
): Promise<{ error: string } | { ok: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти" };
  }

  const requester = await prisma.user.findUnique({
    where: { username: requesterUsername },
    select: { id: true },
  });
  if (!requester) {
    return { error: "Пользователь не найден" };
  }

  try {
    await prisma.friendRequest.updateMany({
      where: { senderId: requester.id, receiverId: session.user.id, ignoredAt: null },
      data: { ignoredAt: new Date() },
    });
  } catch {
    return { error: "Не удалось отложить заявку, попробуй ещё раз" };
  }

  revalidateFriendPaths(session.user.username, requesterUsername);
  return { ok: true };
}

export async function removeFriend(
  targetUsername: string,
): Promise<{ error: string } | { status: FriendshipStatus }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти" };
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) {
    return { error: "Пользователь не найден" };
  }

  const [userAId, userBId] = normalizePair(session.user.id, target.id);

  try {
    await prisma.friendship.delete({ where: { userAId_userBId: { userAId, userBId } } });
  } catch {
    return { error: "Не удалось удалить из друзей, попробуй ещё раз" };
  }

  revalidateFriendPaths(session.user.username, targetUsername);
  return { status: "none" };
}
