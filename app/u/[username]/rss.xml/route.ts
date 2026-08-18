import { getPostsByUsername, getUserByUsername } from "@/lib/posts";
import { renderFeed } from "@/lib/rss";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const posts = await getPostsByUsername(username);

  const xml = renderFeed({
    posts,
    origin,
    channelTitle: `${user.name} — music-diary`,
    channelDescription: `Музыкальный дневник пользователя ${user.name}`,
    channelPath: `/u/${username}`,
    feedPath: `/u/${username}/rss.xml`,
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
