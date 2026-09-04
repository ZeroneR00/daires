import type { PostWithDetails } from "@/lib/posts";

export const RSS_ITEM_LIMIT = 20;

const TITLE_MAX_LENGTH = 80;

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
