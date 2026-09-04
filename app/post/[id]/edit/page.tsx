import Link from "next/link";
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {/* Назад — в саму запись, а не на главную: сюда пришли именно оттуда */}
      <Link
        href={`/u/${post.author.username}/${post.slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← К записи
      </Link>

      <h1 className="font-serif text-2xl tracking-tight text-ink">Редактировать запись</h1>

      <PostForm
        initialText={post.text}
        initialTracks={initialTracks}
        action={updatePost.bind(null, post.id)}
        submitLabel="Сохранить"
        pendingLabel="Сохраняем…"
      />
    </div>
  );
}
