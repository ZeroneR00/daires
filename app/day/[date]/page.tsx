import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLikedPostIds, getPostsByDay, getUserByUsername } from "@/lib/posts";
import {
  dayKeyToRange,
  formatDayAndMonth,
  formatPostDate,
  shiftDayKey,
  toDayKey,
} from "@/lib/format-date";
import { plural } from "@/lib/plural";
import { PostCard } from "@/components/PostCard";
import { Groove } from "@/components/Groove";

export const dynamic = "force-dynamic";

/*
  Один роут на оба охвата: `?u=<username>` сужает день до одного автора.
  Отдельный адрес `/u/[username]/day/[date]` читался бы красивее, но стоил бы
  второй копии страницы — вся разница между режимами здесь умещается в один
  необязательный аргумент запроса.

  В этой версии Next и `params`, и `searchParams` — промисы.
*/
interface DayPageProps {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ u?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: DayPageProps): Promise<Metadata> {
  const range = dayKeyToRange((await params).date);
  if (!range) return {};

  const { u } = await searchParams;
  const label = formatPostDate(range.start);
  return { title: u ? `${label} · @${u} — music-diary` : `${label} — music-diary` };
}

export default async function DayPage({ params, searchParams }: DayPageProps) {
  const { date } = await params;
  const range = dayKeyToRange(date);
  // Ключ разбирается — значит, день существует. Мусор в адресе это не страница
  // без записей, а несуществующая страница.
  if (!range) notFound();

  const username = (await searchParams).u?.trim() || undefined;

  const [session, author] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    username ? getUserByUsername(username) : Promise.resolve(null),
  ]);
  // Автор в адресе есть, а такого автора нет — тоже 404, а не тихий показ
  // общего дня: иначе опечатка в имени молча подменяла бы охват.
  if (username && !author) notFound();

  const posts = await getPostsByDay(range.start, range.end, username);
  const likedPostIds = session
    ? await getLikedPostIds(
        session.user.id,
        posts.map((post) => post.id),
      )
    : new Set<string>();

  // Соседние дни. Ключи получены сдвигом уже проверенного, так что разбираются
  // всегда — но тип этого не знает, поэтому подписи собираем через проверку,
  // а не через восклицательный знак.
  const previousRange = dayKeyToRange(shiftDayKey(date, -1));
  const nextKey = shiftDayKey(date, 1);
  const nextRange = dayKeyToRange(nextKey);
  /*
    Стрелки «вперёд» на сегодняшнем дне нет: за ней бесконечная череда пустых
    завтра. Сравниваем ключи строками — у формы `2026-09-05` старший разряд
    стоит первым, поэтому лексикографический порядок совпадает с календарным
    и разбирать даты обратно не нужно.
  */
  const showNext = nextKey <= toDayKey(new Date());

  const dayHref = (key: string) =>
    username ? `/day/${key}?u=${encodeURIComponent(username)}` : `/day/${key}`;

  const scopeLabel = author ? `Дневник ${author.name}` : "Записи всех авторов";
  const countLabel =
    posts.length > 0
      ? `${posts.length} ${plural(posts.length, "запись", "записи", "записей")}`
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {/* Назад — туда, откуда день является частью: в дневник автора либо
          в общую ленту. Тот же естественный родитель, что у страницы записи */}
      <Link
        href={author ? `/u/${author.username}` : "/"}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        ← {author ? `Дневник ${author.name}` : "На главную"}
      </Link>

      {/* Титульный лист, не карточка: карточки на странице принадлежат
          записям. Охват — тихой подписью под датой, как запрос на /search */}
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl tracking-tight text-ink">
          <time dateTime={date}>{formatPostDate(range.start)}</time>
        </h1>
        <p className="text-sm text-muted">
          {countLabel ? `${scopeLabel} · ${countLabel}` : scopeLabel}
        </p>
      </header>

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/* Чередование знака — свойство списка, как в ленте и на /following.
              В режиме автора имя в шапке карточки лишнее: оно уже в заголовке */}
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              showAuthor={!author}
              currentUserId={session?.user.id}
              isLiked={likedPostIds.has(post.id)}
              showMark={index % 2 === 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line p-6 text-center">
          <p className="font-serif text-lg text-ink">В этот день тишина</p>
          <p className="text-sm text-muted">
            {author
              ? `${author.name} в этот день ничего не записал(а).`
              : "Ни одной записи за эти сутки."}
          </p>
        </div>
      )}

      {/* Тот же знак, что закрывает ленту: записи кончились */}
      <Groove className="pt-2" />

      {/*
        Листалка внизу, а не под заголовком: сначала читают день, потом
        переворачивают страницу. Наверху она спорила бы с ссылкой «назад» —
        три стрелки подряд перестают что-либо значить.
      */}
      <nav className="flex items-center justify-between gap-3 text-sm text-muted">
        {previousRange ? (
          <Link
            href={dayHref(shiftDayKey(date, -1))}
            className="transition-colors hover:text-accent"
          >
            ← {formatDayAndMonth(previousRange.start)}
          </Link>
        ) : (
          <span />
        )}

        {showNext && nextRange && (
          <Link href={dayHref(nextKey)} className="transition-colors hover:text-accent">
            {formatDayAndMonth(nextRange.start)} →
          </Link>
        )}
      </nav>
    </div>
  );
}
