"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleLike(
  postId: string,
  authorUsername: string,
  slug: string,
): Promise<{ error: string } | { liked: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы ставить лайки" };
  }

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });

  let liked: boolean;
  try {
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.like.create({ data: { postId, userId: session.user.id } });
      liked = true;
    }
  } catch {
    return { error: "Не удалось поставить лайк, попробуй ещё раз" };
  }

  revalidatePath("/");
  revalidatePath(`/u/${authorUsername}`);
  revalidatePath(`/u/${authorUsername}/${slug}`);

  return { liked };
}
