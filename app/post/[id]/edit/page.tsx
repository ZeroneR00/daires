import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostById } from "@/lib/posts";
import { PostForm } from "@/components/PostForm";
import type { TrackSource } from "@/lib/track-api";
import { updatePost } from "./actions";

export const dynamic = "force-dynamic";

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const post = await getPostById(id);
  if (!post || post.authorId !== session.user.id) notFound();

  const initialTracks = post.tracks.map((postTrack) => ({
    externalId: postTrack.track.externalId,
    source: postTrack.track.source as TrackSource,
    title: postTrack.track.title,
    artist: postTrack.track.artist,
    album: postTrack.track.album,
    artworkUrl: postTrack.track.artworkUrl,
    previewUrl: postTrack.track.previewUrl,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <div className="rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Редактировать запись
        </h1>

        <div className="mt-6">
          <PostForm
            initialText={post.text}
            initialTracks={initialTracks}
            action={updatePost.bind(null, post.id)}
            submitLabel="Сохранить"
            pendingLabel="Сохраняем…"
          />
        </div>
      </div>
    </div>
  );
}
