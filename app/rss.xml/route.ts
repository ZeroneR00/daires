import { getFeedPosts } from "@/lib/posts";
import { renderFeed } from "@/lib/rss";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const posts = await getFeedPosts();

  const xml = renderFeed({
    posts,
    origin,
    channelTitle: "music-diary",
    channelDescription: "Лента музыкальных дневников",
    channelPath: "/",
    feedPath: "/rss.xml",
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
