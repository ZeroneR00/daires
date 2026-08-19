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
