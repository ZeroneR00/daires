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
        <EmptyState title="Что ищем?">
          Введи минимум {MIN_QUERY_LENGTH} символа — посты, треки и людей ищем
          разом.
        </EmptyState>
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
    ? await getLikedPostIds(
        session.user.id,
        posts.map((post) => post.id),
      )
    : new Set<string>();

  const nothingFound =
    posts.length === 0 && tracks.length === 0 && users.length === 0;

  return (
    <PageShell query={query}>
      {nothingFound && (
        <EmptyState title="Ничего не найдено">
          Ни постов, ни треков, ни людей по этому запросу.
        </EmptyState>
      )}

      {posts.length > 0 && (
        <Section title="Посты">
          {/* Чередование знака через карточку — как в ленте и на /following:
              по умолчанию проп true, и без него знак стоял бы под каждой */}
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session?.user.id}
              isLiked={likedPostIds.has(post.id)}
              showMark={index % 2 === 0}
            />
          ))}
        </Section>
      )}

      {tracks.length > 0 && (
        <Section title="Треки">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} trackId={track.id} />
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

function PageShell({
  query,
  children,
}: {
  query: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {/*
        Запрос вынесен из заголовка в подпись под ним: так «Поиск» остаётся
        заголовком страницы, а не строкой, которая меняет длину на каждый
        ввод — тот же титульный лист, что на остальных экранах.
      */}
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Поиск</h1>
        {query && <p className="text-sm text-muted">По запросу «{query}»</p>}
      </header>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {/* Тихие капсы, как у секций на /friends: подряд идут до трёх секций,
          набранные заголовками они спорили бы и друг с другом, и с «Поиском» */}
      <h2 className="text-xs uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  );
}

/*
  Общая форма пустого состояния, сложившаяся в заходе C: рамка пунктиром,
  строка антиквой, под ней пояснение. Так пустой экран везде на сайте
  читается одинаково.
*/
function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line p-6 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}
