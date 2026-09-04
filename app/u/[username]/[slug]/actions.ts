"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentInputSchema } from "@/lib/comment-schema";

export async function createComment(
  postId: string,
  text: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы комментировать" };
  }

  const parsed = commentInputSchema.safeParse({ text });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректный текст" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { slug: true, author: { select: { username: true } } },
  });
  if (!post) {
    return { error: "Запись не найдена" };
  }

  try {
    await prisma.comment.create({
      data: { postId, authorId: session.user.id, text: parsed.data.text },
    });
  } catch {
    return { error: "Не удалось отправить комментарий, попробуй ещё раз" };
  }

  revalidatePath(`/u/${post.author.username}/${post.slug}`);

  return { success: true };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;

  const commentId = formData.get("commentId");
  if (typeof commentId !== "string") return;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      post: { select: { slug: true, author: { select: { username: true } } } },
    },
  });
  if (!comment || comment.authorId !== session.user.id) return;

  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath(`/u/${comment.post.author.username}/${comment.post.slug}`);
}
