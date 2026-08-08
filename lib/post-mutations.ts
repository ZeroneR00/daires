import type { Prisma } from "@/generated/prisma/client";
import type { PostInput } from "@/lib/post-schema";

type TrackInput = PostInput["tracks"][number];

export async function attachTracksToPost(
  tx: Prisma.TransactionClient,
  postId: string,
  tracks: TrackInput[],
): Promise<void> {
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
      data: { postId, trackId: upsertedTrack.id, position },
    });
  }
}
