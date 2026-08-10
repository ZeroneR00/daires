"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleFollow(
  targetUsername: string,
): Promise<{ error: string } | { following: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы подписываться" };
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) {
    return { error: "Пользователь не найден" };
  }
  if (target.id === session.user.id) {
    return { error: "Нельзя подписаться на себя" };
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: session.user.id, followingId: target.id },
    },
  });

  let following: boolean;
  try {
    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      following = false;
    } else {
      await prisma.follow.create({
        data: { followerId: session.user.id, followingId: target.id },
      });
      following = true;
    }
  } catch {
    return { error: "Не удалось подписаться, попробуй ещё раз" };
  }

  revalidatePath(`/u/${targetUsername}`);
  revalidatePath("/following");

  return { following };
}
