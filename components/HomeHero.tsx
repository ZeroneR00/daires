import Link from "next/link";

interface HomeHeroProps {
  artworks: string[];
  postCount: number;
  authorCount: number;
}

const COLUMNS = 6;
/* Ниже этого числа стена выглядит дырявой, поэтому набор обложек повторяется */
const MIN_TILES = 30;

/*
  Первый экран: стена обложек из настоящих записей ленты, медленно едущая
  вверх-вниз, и заголовок поверх неё. Обложки — не декоративные заглушки: сайт
  показывает то, что в него уже принесли.

  Стена растворяется к центру маской, поэтому текст читается без плашки —
  затемняющий оверлей поверх картинок выглядел бы дёшево.
*/
export function HomeHero({ artworks, postCount, authorCount }: HomeHeroProps) {
  // Раскладываем обложки по колонкам и дублируем: половина высоты уезжает,
  // вторая занимает её место — так цикл анимации не имеет видимого шва.
  const tiles: string[] = [];
  while (artworks.length > 0 && tiles.length < MIN_TILES) {
    tiles.push(...artworks);
  }

  const columns = Array.from({ length: COLUMNS }, (_, columnIndex) =>
    tiles.filter((_, index) => index % COLUMNS === columnIndex),
  ).filter((column) => column.length > 0);

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {columns.length > 0 && (
        <div
          aria-hidden
          className="hero-wall pointer-events-none absolute inset-0 -z-10 grid grid-cols-3 gap-3 p-3 sm:grid-cols-6"
        >
          {columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              className={`marquee-col flex flex-col gap-3 ${
                columnIndex % 2 === 1 ? "marquee-col--down" : ""
              }`}
              style={{ animationDuration: `${52 + columnIndex * 9}s` }}
            >
              {[...column, ...column, ...column].map((url, index) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Музыкальный дневник
        </p>

        <h1 className="mx-auto mt-5 max-w-3xl font-serif text-4xl leading-[1.08] tracking-tight text-ink sm:text-6xl">
          Дневник, который{" "}
          <span className="relative whitespace-nowrap">
            слушают
            <span
              aria-hidden
              className="absolute -bottom-2 left-0 h-[0.13em] w-full rounded-full bg-accent/70"
            />
          </span>
        </h1>

        <p className="prose-diary mx-auto mt-6 max-w-xl text-muted">
          Каждая запись — личный текст и трек, который к нему прилагается.
          Не плейлист, а то, что вокруг музыки происходит.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-medium">
          <Link
            href="/signup"
            className="flex h-11 items-center rounded-full bg-accent px-6 text-accent-ink shadow-[0_10px_30px_-12px_var(--accent)] transition-transform hover:-translate-y-0.5"
          >
            Завести дневник
          </Link>
          <Link
            href="/login"
            className="flex h-11 items-center rounded-full border border-line bg-surface/70 px-6 text-ink backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
          >
            Войти
          </Link>
        </div>

        {postCount > 0 && (
          <p className="mt-8 text-sm text-muted">
            Уже {postCount} {plural(postCount, "запись", "записи", "записей")} от{" "}
            {authorCount} {plural(authorCount, "автора", "авторов", "авторов")}
          </p>
        )}

      </div>
    </section>
  );
}

/* Русская плюрализация: 1 запись / 2 записи / 5 записей */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
