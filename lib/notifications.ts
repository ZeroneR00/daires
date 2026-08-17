"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface FriendRequestNotice {
  count: number;
  latestUsername: string;
  // epoch ms самой свежей заявки — по нему тост понимает, сообщал ли он уже
  // про этот набор заявок или пришло что-то новое. Date через границу Server
  // Action прошёл бы (Next её сериализует), но число проще сравнивать и
  // класть в localStorage.
  latestCreatedAt: number;
}

// Читающий Server Action, а не route handler: своих route-хендлеров в проекте
// нет вообще (кроме catch-all Better Auth), заводить новый вид эндпоинта ради
// одного счётчика не за чем. Параметров нет намеренно — получателем всегда
// является владелец сессии, подставить чужой id снаружи нечем.
export async function getFriendRequestNotice(): Promise<FriendRequestNotice | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }

  // ignoredAt: null — отложенные через "Позже" заявки не дёргают ни счётчик
  // в шапке, ни тост, но остаются видны в своей секции на /friends.
  const receiverId = session.user.id;
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
