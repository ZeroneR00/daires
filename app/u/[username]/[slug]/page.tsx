import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPostDate } from "@/lib/format-date";
import { getPostBySlug } from "@/lib/posts";
import { TrackRow } from "@/components/TrackRow";

export const dynamic = "force-dynamic";

interface PostPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { username, slug } = await params;
  const post = await getPostBySlug(username, slug);

  if (!post) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <article className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href={`/u/${post.author.username}`}
            className="font-medium text-black dark:text-zinc-50"
          >
            {post.author.name}
          </Link>
          <span>·</span>
          <span>{formatPostDate(post.createdAt)}</span>
        </div>

        <p className="whitespace-pre-wrap text-black dark:text-zinc-50">
          {post.text}
        </p>

        {post.tracks.length > 0 && (
          <div className="flex flex-col gap-2">
            {post.tracks.map((postTrack) => (
              <TrackRow key={postTrack.id} track={postTrack.track} />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
