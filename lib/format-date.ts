const formatter = new Intl.DateTimeFormat("ru", {
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
const marginDayFormatter = new Intl.DateTimeFormat("ru", { day: "numeric" });
const marginMonthFormatter = new Intl.DateTimeFormat("ru", { month: "short" });

export interface PostDateParts {
  day: string;
  month: string;
  /** Только если год не текущий: в дневнике «2026» под каждой записью — шум. */
  year: string | null;
}

export function formatPostDateParts(date: Date): PostDateParts {
  const year = date.getFullYear();
  return {
    day: marginDayFormatter.format(date),
    // Короткий месяц по-русски приходит с точкой («авг.»), кроме мая.
    month: marginMonthFormatter.format(date).replace(/\.$/, ""),
    year: year === new Date().getFullYear() ? null : String(year),
  };
}
