import { getFeedPosts } from "@/lib/posts";
import { renderFeed } from "@/lib/rss";

/*
  Route handler, а не Server Action — редкое в этом проекте исключение из
  «мутации и чтение через Server Actions». Причина простая: экшен нельзя открыть
  в браузере, у него нет постоянного URL и ему нельзя выставить Content-Type,
  а читалке нужно ровно это. Соседний фид автора устроен так же.
*/
export async function GET(request: Request) {
  // Origin берём из самого запроса: ни конфига, ни env-переменной с адресом
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
