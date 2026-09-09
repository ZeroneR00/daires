import Link from "next/link";

/*
  Листалка админских списков.

  Ссылки строятся из ТЕКУЩИХ query-параметров через URLSearchParams, а не
  склейкой строк: иначе `?q=` терялся бы на каждом переходе, и модератор,
  отфильтровав список, на второй странице внезапно видел бы всё подряд.

  Номера, а не только «дальше/назад»: ради прыжка на дальнюю страницу
  страничная пагинация здесь и выбрана (довод целиком — в шапке
  lib/admin-queries.ts). Окно узкое — края плюс соседи текущей, иначе на
  сотне страниц листалка сама станет портянкой.

  Залитых кнопок здесь нет намеренно: правило ветки — на списках главного
  действия не бывает, все действия тихие.
*/

interface AdminPagerProps {
  basePath: string;
  page: number;
  pageCount: number;
  /** Текущие query-параметры страницы; `page` из них игнорируется. */
  params: Record<string, string | undefined>;
}

const linkClassName =
  "rounded-full px-3 py-1 text-sm text-muted transition-colors hover:bg-accent-wash hover:text-accent";

export function AdminPager({
  basePath,
  page,
  pageCount,
  params,
}: AdminPagerProps) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "page" && value) search.set(key, value);
    }
    // Первую страницу пишем без `?page=1` — адрес списка и его первой
    // страницы должен быть одним и тем же.
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const numbers = pageWindow(page, pageCount);

  return (
    <nav className="flex flex-wrap items-center gap-1 pt-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={linkClassName}>
          ← Назад
        </Link>
      )}

      {numbers.map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-muted">
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className="rounded-full bg-accent-wash px-3 py-1 text-sm font-medium text-accent"
          >
            {entry}
          </span>
        ) : (
          <Link key={entry} href={hrefFor(entry)} className={linkClassName}>
            {entry}
          </Link>
        ),
      )}

      {page < pageCount && (
        <Link href={hrefFor(page + 1)} className={linkClassName}>
          Дальше →
        </Link>
      )}
    </nav>
  );
}

/** Края, соседи текущей и `null` вместо выброшенных кусков (рисуется как «…»). */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  const shown = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const numbers = [...shown]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const result: (number | null)[] = [];
  let previous = 0;
  for (const n of numbers) {
    if (previous && n - previous > 1) result.push(null);
    result.push(n);
    previous = n;
  }
  return result;
}
