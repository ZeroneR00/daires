"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUnreadCount } from "@/lib/messages";

export interface FriendRequestNotice {
  count: number;
  latestUsername: string;
  // epoch ms самой свежей заявки — по нему тост понимает, сообщал ли он уже
  // про этот набор заявок или пришло что-то новое. Date через границу Server
  // Action прошёл бы (Next её сериализует), но число проще сравнивать и
  // класть в localStorage.
  latestCreatedAt: number;
}

export interface Notices {
  friendRequests: FriendRequestNotice | null;
  unreadMessages: number;
}

// Не экспортируется: наружу из "use server"-файла разрешены только async-функции,
// а вызывать это извне и незачем — провайдер забирает оба уведомления разом.
async function readFriendRequestNotice(
  receiverId: string,
): Promise<FriendRequestNotice | null> {
  // ignoredAt: null — отложенные через "Позже" заявки не дёргают ни счётчик
  // в шапке, ни тост, но остаются видны в своей секции на /friends.
  const where = { receiverId, ignoredAt: null };
  const [count, latest] = await Promise.all([
    prisma.friendRequest.count({ where }),
    prisma.friendRequest.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, sender: { select: { username: true } } },
    }),
  ]);

  if (count === 0 || !latest) {
    return null;
  }

  return {
    count,
    latestUsername: latest.sender.username,
    latestCreatedAt: latest.createdAt.getTime(),
  };
}

// Читающий Server Action, а не route handler: своих route-хендлеров в проекте
// нет вообще (кроме catch-all Better Auth), заводить новый вид эндпоинта ради
// счётчиков не за чем. Параметров нет намеренно — получателем всегда является
// владелец сессии, подставить чужой id снаружи нечем.
//
// Одна функция на оба уведомления, а не две: провайдер зовёт их всегда вместе
// (при монтировании, смене маршрута, возврате на вкладку и по Realtime-пингу),
// и один round-trip дешевле двух, а сессия читается один раз на оба запроса.
export async function getNotices(): Promise<Notices> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { friendRequests: null, unreadMessages: 0 };
  }

  const [friendRequests, unreadMessages] = await Promise.all([
    readFriendRequestNotice(session.user.id),
    getUnreadCount(session.user.id),
  ]);

  return { friendRequests, unreadMessages };
}
