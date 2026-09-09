"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { toDayKey } from "@/lib/format-date";

/*
  Мутации админки — все в одном файле на всю ветку `/admin`.

  Довод проектный: `toggleFollow` живёт в `actions.ts` своего роута, потому что
  кнопка есть ровно на одной странице; `toggleLike` уехал в `lib/`, потому что
  зовётся с трёх. Админские экшены зовутся только из-под `/admin` — это случай
  `toggleFollow`, только владелец не страница, а целая ветка.

  Гард стоит в КАЖДОМ экшене, а не только на страницах: функция с "use server"
  это публичный POST-эндпоинт, и попасть в неё можно, ни разу не открыв
  админскую страницу.

  Все экшены — `void`-формы (zero-JS `<form action={...}>`), как существующий
  `deleteComment`. Ошибки наружу не отдаём: места под ответ у такой формы нет,
  а неудача и так видна — строка осталась на месте.
*/

export async function deleteCommentAsAdmin(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const commentId = formData.get("commentId");
  if (typeof commentId !== "string") return;

  // Адрес публичной страницы записи нужен до удаления: после него связь
  // с постом уже не спросишь.
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      post: { select: { slug: true, author: { select: { username: true } } } },
    },
  });
  if (!comment) return;

  await prisma.comment.delete({ where: { id: commentId } });

  /*
    revalidatePath при `force-dynamic` выглядит лишним — страница и так
    собирается на каждый запрос. Он нужен ради другого кэша: клиентского
    Router Cache. Без него «Назад» после удаления показал бы страницу
    с уже удалённым комментарием, взятую из памяти браузера.
  */
  revalidatePath("/admin/comments");
  revalidatePath("/admin");
  revalidatePath(`/u/${comment.post.author.username}/${comment.post.slug}`);
}

export async function deletePostAsAdmin(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const postId = formData.get("postId");
  if (typeof postId !== "string") return;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      slug: true,
      createdAt: true,
      author: { select: { username: true } },
    },
  });
  if (!post) return;

  // Каскад по схеме сносит комментарии, лайки и связи post_track. Сами треки
  // остаются — они кэш метаданных, а не часть записи; осиротевшие убираются
  // отдельным разделом.
  await prisma.post.delete({ where: { id: postId } });

  const username = post.author.username;
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/u/${username}`);
  revalidatePath(`/u/${username}/${post.slug}`);
  // Страница суток, в которых лежала запись: адрес считается в поясе сайта,
  // тем же helper'ом, что и сама страница /day.
  revalidatePath(`/day/${toDayKey(post.createdAt)}`);

  /*
    redirect() — строго ПОСЛЕ всей работы и никогда не внутри try/catch:
    внутри он бросает NEXT_REDIRECT, и привычный
    `try { await prisma… } catch { … }` молча проглотил бы переход,
    оставив пользователя на странице подтверждения удалённой записи.
  */
  redirect("/admin/posts");
}
