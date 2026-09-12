import type { PostWithDetails } from "@/lib/posts";

/*
  Сборка RSS. Резать ленту до этого лимита — задача здесь, а не в query-слое:
  getPostsByUsername() отдаёт все посты автора без ограничения, потому что её
  зовёт ещё и страница дневника, которой лимит не нужен.
*/
export const RSS_ITEM_LIMIT = 20;

const TITLE_MAX_LENGTH = 80;

/*
  Порядок замен важен: & обязан идти первым. Иначе он пройдётся по уже
  подставленным &lt; / &gt; и превратит их в &amp;lt; — экранирование задвоится.
*/
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const boundary = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${boundary}…`;
}

/*
  Заголовок записи генерируется на лету и нигде не хранится: поля Post.title
  в схеме нет и заводить его ради фида не стали. Три ступени вниз — первая
  непустая строка текста, потом «Артист — Название» первого трека (пост без
  текста, только с треком, — штатный случай), потом слово «Запись».
*/
export function deriveTitle(post: PostWithDetails): string {
  const firstLine = post.text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine) {
    return truncate(firstLine, TITLE_MAX_LENGTH);
  }

  const firstTrack = post.tracks[0]?.track;
  if (firstTrack) {
    return `${firstTrack.artist} — ${firstTrack.title}`;
  }

  return "Запись";
}

function renderItem(post: PostWithDetails, origin: string): string {
  const link = `${origin}/u/${post.author.username}/${post.slug}`;
  return [
    "<item>",
    `<title>${escapeXml(deriveTitle(post))}</title>`,
    `<link>${escapeXml(link)}</link>`,
    `<guid>${escapeXml(link)}</guid>`,
    // toUTCString (RFC-1123), а не toISOString: часть читалок ISO не разберёт
    `<pubDate>${post.createdAt.toUTCString()}</pubDate>`,
    `<description>${escapeXml(post.text)}</description>`,
    "</item>",
  ].join("\n");
}

interface RenderFeedOptions {
  posts: PostWithDetails[];
  origin: string;
  channelTitle: string;
  channelDescription: string;
  channelPath: string;
  feedPath: string;
}

export function renderFeed({
  posts,
  origin,
  channelTitle,
  channelDescription,
  channelPath,
  feedPath,
}: RenderFeedOptions): string {
  const channelLink = `${origin}${channelPath}`;
  const feedUrl = `${origin}${feedPath}`;
  const items = posts.slice(0, RSS_ITEM_LIMIT).map((post) => renderItem(post, origin));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(channelTitle)}</title>`,
    `<link>${escapeXml(channelLink)}</link>`,
    `<description>${escapeXml(channelDescription)}</description>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");
}
