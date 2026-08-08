"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlugForAuthor } from "@/lib/slug";
import { postInputSchema, type PostInput } from "@/lib/post-schema";
import { attachTracksToPost } from "@/lib/post-mutations";
import { searchTracks, TrackSearchError, type NormalizedTrack } from "@/lib/track-api";

export async function searchTracksAction(query: string): Promise<NormalizedTrack[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Нужно войти, чтобы искать треки");
  }

  try {
    return await searchTracks(query);
  } catch (error) {
    if (error instanceof TrackSearchError) {
      throw new Error("Не удалось выполнить поиск треков, попробуй ещё раз");
    }
    throw error;
  }
}

export async function createPost(
  input: PostInput,
): Promise<{ error: string } | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы опубликовать запись" };
  }

  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const { text, tracks } = parsed.data;
  const authorId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const slug = await generateUniqueSlugForAuthor(tx, authorId);
      const post = await tx.post.create({
        data: { authorId, slug, text },
      });

      await attachTracksToPost(tx, post.id, tracks);
    });
  } catch {
    return { error: "Не удалось сохранить запись, попробуй ещё раз" };
  }

  revalidatePath("/");
  redirect("/");
}
