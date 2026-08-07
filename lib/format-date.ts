const formatter = new Intl.DateTimeFormat("ru", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatPostDate(date: Date): string {
  return formatter.format(date);
}
