"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postInputSchema, type PostInput } from "@/lib/post-schema";
import { attachTracksToPost } from "@/lib/post-mutations";

export async function updatePost(
  postId: string,
  input: PostInput,
): Promise<{ error: string } | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы редактировать запись" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, slug: true },
  });
  if (!post || post.authorId !== session.user.id) {
    return { error: "Эту запись нельзя редактировать" };
  }

  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const { text, tracks } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id: postId }, data: { text } });
      await tx.postTrack.deleteMany({ where: { postId } });
      await attachTracksToPost(tx, postId, tracks);
    });
  } catch {
    return { error: "Не удалось сохранить изменения, попробуй ещё раз" };
  }

  const { username } = session.user;
  revalidatePath("/");
  revalidatePath(`/u/${username}`);
  revalidatePath(`/u/${username}/${post.slug}`);
  redirect(`/u/${username}/${post.slug}`);
}
