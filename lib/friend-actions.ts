"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePair, type FriendshipStatus } from "@/lib/friends";

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

  // Встречная заявка (B уже позвал A, пока A звал B) — сразу дружба,
  // без "обе заявки висят, никто не жал Принять".
  const reverseRequest = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId: target.id, receiverId: myId } },
  });

  let status: FriendshipStatus;
  try {
    if (reverseRequest) {
      const [userAId, userBId] = normalizePair(myId, target.id);
      await prisma.$transaction([
        prisma.friendRequest.delete({ where: { id: reverseRequest.id } }),
        prisma.friendship.create({ data: { userAId, userBId } }),
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
    await prisma.friendRequest.delete({
      where: { senderId_receiverId: { senderId: session.user.id, receiverId: target.id } },
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
      prisma.friendRequest.delete({
        where: { senderId_receiverId: { senderId: requester.id, receiverId: myId } },
      }),
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
    await prisma.friendRequest.delete({
      where: { senderId_receiverId: { senderId: requester.id, receiverId: session.user.id } },
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
