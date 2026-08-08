import { z } from "zod";

const trackSchema = z.object({
  externalId: z.string().min(1),
  source: z.enum(["itunes", "musicbrainz"]),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable(),
  artworkUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
});

export const postInputSchema = z
  .object({
    text: z.string().trim(),
    tracks: z.array(trackSchema),
  })
  .refine((data) => data.text.length > 0 || data.tracks.length > 0, {
    message: "Добавь текст или хотя бы один трек",
    path: ["text"],
  });

export type PostInput = z.input<typeof postInputSchema>;
