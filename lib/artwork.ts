/*
  iTunes отдаёт обложку в URL вида .../100x100bb.jpg, и именно 100px лежит
  в базе у всех уже сохранённых треков. Размер зашит в сам адрес, так что
  запросить крупнее можно подменой сегмента — без миграции данных и без
  повторного похода во внешний API.

  Адреса другого вида (Cover Art Archive у MusicBrainz) под регулярку не
  попадают и возвращаются как есть — это штатная ветка, не ошибка.
*/
export function artworkAtSize(url: string | null, size: number): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+(bb)?\.(jpg|jpeg|png)$/i, `/${size}x${size}$1.$2`);
}
