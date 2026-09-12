"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commentInputSchema } from "@/lib/comment-schema";
import { reportInputSchema } from "@/lib/report-schema";

export async function createComment(
  postId: string,
  text: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы комментировать" };
  }

  const parsed = commentInputSchema.safeParse({ text });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректный текст" };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { slug: true, author: { select: { username: true } } },
  });
  if (!post) {
    return { error: "Запись не найдена" };
  }

  try {
    await prisma.comment.create({
      data: { postId, authorId: session.user.id, text: parsed.data.text },
    });
  } catch {
    return { error: "Не удалось отправить комментарий, попробуй ещё раз" };
  }

  revalidatePath(`/u/${post.author.username}/${post.slug}`);

  return { success: true };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;

  const commentId = formData.get("commentId");
  if (typeof commentId !== "string") return;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      post: { select: { slug: true, author: { select: { username: true } } } },
    },
  });
  if (!comment || comment.authorId !== session.user.id) return;

  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath(`/u/${comment.post.author.username}/${comment.post.slug}`);
}

/*
  Жалоба на запись или комментарий.

  Живёт здесь, а не в `app/admin/actions.ts`: зовётся с публичной страницы
  записи, рядом с `createComment` — по тому же правилу, по которому
  `toggleFollow` лежит в actions.ts своего роута.

  Цель приходит объектом с одним заполненным полем, а не парой
  `(type, id)`: так же устроена и таблица (два nullable FK), и лишнего
  перевода одного представления в другое не возникает.
*/
export type ReportTarget = { postId: string } | { commentId: string };

export async function createReport(
  target: ReportTarget,
  reason: string,
): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Нужно войти, чтобы пожаловаться" };
  }

  const parsed = reportInputSchema.safeParse({ reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректная причина" };
  }

  /*
    Автора цели достаём ради одного сравнения: на своё жаловаться нельзя.
    Кнопку своему и так не рисуем, но гард обязан быть в экшене — "use server"
    это публичный POST.

    Заодно проверка «цель вообще существует»: без неё вставка упала бы
    нарушением внешнего ключа, и пользователь увидел бы общую ошибку вместо
    внятного «запись удалена».
  */
  const authorId =
    "postId" in target
      ? (
          await prisma.post.findUnique({
            where: { id: target.postId },
            select: { authorId: true },
          })
        )?.authorId
      : (
          await prisma.comment.findUnique({
            where: { id: target.commentId },
            select: { authorId: true },
          })
        )?.authorId;

  if (!authorId) {
    return { error: "Это уже удалили" };
  }
  if (authorId === session.user.id) {
    return { error: "На своё жаловаться незачем" };
  }

  try {
    await prisma.report.create({
      data: { ...target, reporterId: session.user.id, reason: parsed.data.reason },
    });
  } catch (error) {
    /*
      P2002 — нарушение уникального индекса, то есть «этот пользователь на
      этот объект уже жаловался». Проверять заранее отдельным запросом не
      стали: уник ловит то же самое и без гонки между проверкой и вставкой.

      Код читаем утиной типизацией, а не `instanceof PrismaClientKnownRequestError`:
      класс пришлось бы тянуть из сгенерированной папки, а прецедента такого
      импорта в проекте нет. Поле `code` у known-ошибок Prisma публичное.
    */
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;

    if (code === "P2002") {
      return { error: "Ты уже жаловался на это — разберёмся" };
    }
    return { error: "Не удалось отправить жалобу, попробуй ещё раз" };
  }

  /*
    revalidatePath здесь нет намеренно: страница записи про жалобы ничего не
    показывает — ни счётчика, ни отметки «ты уже жаловался». Ответ
    пользователю даёт сам компонент, менять на странице нечего.
  */
  return { success: true };
}
