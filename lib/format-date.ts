/*
  Все даты сайта считаются в одном прибитом поясе, а не по часам машины, где
  запущен Node. Причина не в удобстве: `Intl` без `timeZone` берёт зону
  процесса — на деве это МСК, на хостинге обычно UTC. Пока от границ суток
  ничего не зависело, разница была невидимой, но страница дня (/day/[date])
  делает её видимой сразу: запись, созданная в 01:00 по Москве, подписана
  «6 сент», а в UTC-сутках лежит в «5 сент» — и ссылка с подписи вела бы на
  день, где этой записи нет.

  Поэтому здесь же, рядом с подписями, живут и границы суток: подпись и день,
  на который она ссылается, обязаны считаться одним и тем же способом, а
  надёжнее всего это держится, когда способ ровно один и лежит в одном файле.
*/
export const SITE_TIME_ZONE = "Europe/Moscow";

const formatter = new Intl.DateTimeFormat("ru", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatPostDate(date: Date): string {
  return formatter.format(date);
}

// Отдельный формат для сообщений: в переписке важно время, а не только дата,
// и месяц короткий — строка висит под каждым пузырём и не должна их распирать.
const messageFormatter = new Intl.DateTimeFormat("ru", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMessageTime(date: Date): string {
  return messageFormatter.format(date);
}

// Третий формат — для даты на полях карточки: там она стоит вертикальным
// столбиком, поэтому нужны части по отдельности, а не готовая строка.
const marginDayFormatter = new Intl.DateTimeFormat("ru", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
});
const marginMonthFormatter = new Intl.DateTimeFormat("ru", {
  timeZone: SITE_TIME_ZONE,
  month: "short",
});

export interface PostDateParts {
  day: string;
  month: string;
  /** Только если год не текущий: в дневнике «2026» под каждой записью — шум. */
  year: string | null;
}

export function formatPostDateParts(date: Date): PostDateParts {
  // Год берём из ключа дня, а не из `date.getFullYear()`: тот считает по зоне
  // процесса, и 1 января пара часов подписывалась бы прошлым годом.
  const year = toDayKey(date).slice(0, 4);
  return {
    day: marginDayFormatter.format(date),
    // Короткий месяц по-русски приходит с точкой («авг.»), кроме мая.
    month: marginMonthFormatter.format(date).replace(/\.$/, ""),
    year: year === toDayKey(new Date()).slice(0, 4) ? null : year,
  };
}

// Четвёртый формат — для стрелок «предыдущий / следующий день»: год там лишний
// (он уже стоит в заголовке страницы), а короткий месяц читается как обрубок.
const dayAndMonthFormatter = new Intl.DateTimeFormat("ru", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "long",
});

export function formatDayAndMonth(date: Date): string {
  return dayAndMonthFormatter.format(date);
}

/* --- Ключ дня: `2026-09-05` в адресе страницы --- */

const DAY_MS = 24 * 60 * 60 * 1000;

// `en-CA` — локаль, чей числовой формат совпадает с ISO-датой ровно, поэтому
// ключ берём у неё, а не собираем из частей и не режем `toISOString()`:
// последний всегда отдал бы UTC-сутки, мимо нашего пояса.
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Момент времени → сутки, к которым он относится в поясе сайта. */
export function toDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/*
  Смещение пояса в конкретный момент. Считаем через `Intl`, а не константой
  «+3 часа»: источник правды тогда один — SITE_TIME_ZONE, и никакая пара
  значений не сможет разъехаться.

  Приём стандартный: попросить у форматтера местное время по частям, собрать
  из них момент так, будто это UTC, и вычесть исходный. Разница и есть
  смещение.
*/
const offsetProbeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zoneOffsetMs(instant: Date): number {
  // Ключ помечен как string явно: иначе Map унаследует узкий союз типов частей
  // из formatToParts, и обращение по обычной строке компилятор не пропустит.
  const parts = new Map<string, string>(
    offsetProbeFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const at = (type: string) => Number(parts.get(type));
  return (
    Date.UTC(
      at("year"),
      at("month") - 1,
      at("day"),
      // `hour12: false` в части движков отдаёт полночь как «24», а не «00» —
      // без остатка от деления сутки уезжали бы на один день вперёд.
      at("hour") % 24,
      at("minute"),
      at("second"),
    ) - instant.getTime()
  );
}

export interface DayRange {
  start: Date;
  /** Граница исключающая: полночь уже следующих суток. */
  end: Date;
}

/**
 * Ключ дня → полуинтервал в UTC, которым можно спрашивать базу.
 * `null` — если ключ не разбирается; вызывающий отвечает за 404.
 */
export function dayKeyToRange(key: string): DayRange | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;

  // Регулярка проверяет только форму. `Date.parse` отсекает заведомую чушь
  // вроде 13-го месяца, но не всё: 30 февраля он молча перекатывает на 2 марта
  // (проверено, а не предположено — ISO-разбор пропускает любой день 01-31).
  const midnightAsUtc = Date.parse(`${key}T00:00:00.000Z`);
  if (Number.isNaN(midnightAsUtc)) return null;

  // Смещение берём дважды: сначала прикидкой по UTC-полуночи, потом уточняем
  // уже по местной. Разойтись эти два значения могут, только если перевод
  // часов случился в эту самую ночь — в Москве переводов нет с 2014-го, но
  // лишнее вычитание дешевле, чем зависимость от этого факта.
  const guess = midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc));
  const start = new Date(midnightAsUtc - zoneOffsetMs(new Date(guess)));

  // Ловушка на перекат: у настоящего дня начало суток обязано лежать в этом же
  // дне. У 30 февраля начало уедет во 2 марта — и ключ перестанет совпадать.
  // Заодно эта проверка страхует всю арифметику выше: разъедься она однажды,
  // страница честно отдаст 404, а не чужие записи под чужим заголовком.
  if (toDayKey(start) !== key) return null;

  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/**
 * Соседний день для стрелок. Арифметика идёт по «наивной» полуночи в UTC:
 * ключ — это календарная запись, а не момент времени, поэтому пояс к сдвигу
 * отношения не имеет и попасть на переводе часов тут некуда.
 */
export function shiftDayKey(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
