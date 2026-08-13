import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getLikedPostIds } from "@/lib/posts";
import { searchPosts, searchTracks, searchUsers } from "@/lib/search";
import { PostCard } from "@/components/PostCard";
import { TrackRow } from "@/components/TrackRow";
import { UserResultRow } from "@/components/UserResultRow";

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 2;

// В этой версии Next `searchParams` — промис, как и `params`.
interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = (await searchParams).q?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return (
      <PageShell query={query}>
        <EmptyState>Введи минимум {MIN_QUERY_LENGTH} символа.</EmptyState>
      </PageShell>
    );
  }

  // Три независимых запроса — параллельно, а не один за другим.
  const [posts, tracks, users] = await Promise.all([
    searchPosts(query),
    searchTracks(query),
    searchUsers(query),
  ]);

  // Роут публичный: сессия нужна не для доступа, а только чтобы знать,
  // какие из найденных постов лайкнул текущий зритель.
  const session = await auth.api.getSession({ headers: await headers() });
  const likedPostIds = session
    ? await getLikedPostIds(session.user.id, posts.map((post) => post.id))
    : new Set<string>();

  const nothingFound = posts.length === 0 && tracks.length === 0 && users.length === 0;

  return (
    <PageShell query={query}>
      {nothingFound && <EmptyState>Ничего не найдено по запросу «{query}».</EmptyState>}

      {posts.length > 0 && (
        <Section title="Посты">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session?.user.id}
              isLiked={likedPostIds.has(post.id)}
            />
          ))}
        </Section>
      )}

      {tracks.length > 0 && (
        <Section title="Треки">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} />
          ))}
        </Section>
      )}

      {users.length > 0 && (
        <Section title="Пользователи">
          {users.map((user) => (
            <UserResultRow key={user.id} user={user} />
          ))}
        </Section>
      )}
    </PageShell>
  );
}

function PageShell({ query, children }: { query: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {query ? `Поиск: ${query}` : "Поиск"}
      </h1>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-black/[.15] p-6 text-center dark:border-white/[.2]">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{children}</p>
    </div>
  );
}
