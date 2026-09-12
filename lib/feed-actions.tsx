"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getFeedPosts,
  getFollowingFeedPosts,
  getLikedPostIds,
  type FeedPage,
} from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

/*
  Подгрузка ленты возвращает не данные, а готовую разметку — и это главное
  решение файла.

  Причина: `PostCard` — серверный компонент, он тянет за собой `PostTrackList`,
  `TrackArtwork`, `LikeButton` и половину дерева. Клиентский загрузчик
  импортировать его не может физически, так что вариантов было два: сделать
  карточку клиентской (утащить в браузер всё это ради одной кнопки «Ещё») или
  оставить рендер на сервере и передать клиенту результат. React умеет
  сериализовать элементы тем же протоколом, каким сервер и так отдаёт страницу,
  поэтому Server Action вправе вернуть JSX. Клиент только вставляет полученный
  кусок в конец списка.

  Побочная выгода: разметка карточки существует ровно в одном месте. Верни мы
  сюда JSON — пришлось бы держать вторую, клиентскую копию `PostCard` и следить,
  чтобы они не разъезжались.

  Экшены живут в `lib/`, а не в `actions.ts` одного роута: их зовут две ленты,
  общая и персональная, — та же логика, что у `toggleLike`.
*/

async function renderChunk(
  page: FeedPage,
  startIndex: number,
  currentUserId?: string,
) {
  const likedPostIds = currentUserId
    ? await getLikedPostIds(
        currentUserId,
        page.posts.map((post) => post.id),
      )
    : new Set<string>();

  return {
    nodes: page.posts.map((post, index) => (
      <PostCard
        key={post.id}
        post={post}
        currentUserId={currentUserId}
        isLiked={likedPostIds.has(post.id)}
        /*
          Чередование знака считается от общего числа уже показанных записей,
          а не от начала порции: иначе на каждом шве знак вставал бы под двумя
          карточками подряд.
        */
        showMark={(startIndex + index) % 2 === 0}
      />
    )),
    nextCursor: page.nextCursor,
    nextIndex: startIndex + page.posts.length,
  };
}

export async function loadMoreFeed(cursor: string, startIndex: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  return renderChunk(await getFeedPosts(cursor), startIndex, session?.user.id);
}

export async function loadMoreFollowingFeed(cursor: string, startIndex: number) {
  const session = await auth.api.getSession({ headers: await headers() });

  /*
    Гард внутри экшена, а не в UI: `"use server"`-функция — публичный POST.
    И `userId` берётся из сессии, а не из аргумента, иначе любой желающий
    вычитал бы чужую персональную ленту, подставив чужой id.
  */
  if (!session) {
    return { nodes: null, nextCursor: null, nextIndex: startIndex };
  }

  return renderChunk(
    await getFollowingFeedPosts(session.user.id, cursor),
    startIndex,
    session.user.id,
  );
}
