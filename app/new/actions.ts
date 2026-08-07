"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlugForAuthor } from "@/lib/slug";
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

const trackSchema = z.object({
  externalId: z.string().min(1),
  source: z.enum(["itunes", "musicbrainz"]),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable(),
  artworkUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
});

const createPostSchema = z.object({
  text: z.string().trim().min(1, "Текст поста не может быть пустым"),
  tracks: z.array(trackSchema).min(1, "Добавь хотя бы один трек"),
});

export type CreatePostInput = z.input<typeof createPostSchema>;

export async function createPost(
  input: CreatePostInput,
): Promise<{ error: string } | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы опубликовать запись" };
  }

  const parsed = createPostSchema.safeParse(input);
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

      for (let position = 0; position < tracks.length; position++) {
        const track = tracks[position];
        const upsertedTrack = await tx.track.upsert({
          where: { externalId: track.externalId },
          create: {
            externalId: track.externalId,
            source: track.source,
            title: track.title,
            artist: track.artist,
            album: track.album,
            artworkUrl: track.artworkUrl,
            previewUrl: track.previewUrl,
          },
          update: {
            title: track.title,
            artist: track.artist,
            album: track.album,
            artworkUrl: track.artworkUrl,
            previewUrl: track.previewUrl,
          },
        });

        await tx.postTrack.create({
          data: { postId: post.id, trackId: upsertedTrack.id, position },
        });
      }
    });
  } catch {
    return { error: "Не удалось сохранить запись, попробуй ещё раз" };
  }

  revalidatePath("/");
  redirect("/");
}
