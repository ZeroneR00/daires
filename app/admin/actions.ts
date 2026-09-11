"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_ROLE, USER_ROLE, getAdminSession } from "@/lib/admin";
import { REPORT_STATUS, isReportStatus } from "@/lib/report-schema";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
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

/*
  ─── Пользователи ──────────────────────────────────────────────────────────
*/

export async function setUserRole(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const userId = formData.get("userId");
  const role = formData.get("role");
  if (typeof userId !== "string" || typeof role !== "string") return;

  /*
    Белый список ролей — не формальность. Значение приходит скрытым полем
    формы, то есть управляется отправителем целиком: без этой строки любой
    админ (а в перспективе — модератор) записал бы в колонку произвольную
    строку, и `role === ADMIN_ROLE` в гарде начал бы врать молча.
  */
  if (role !== ADMIN_ROLE && role !== USER_ROLE) return;

  /*
    Самозащита: свою роль не трогаем вообще. Сформулировано шире, чем
    «нельзя снять роль себе», нарочно — так правило не зависит от того,
    что прислали в поле, и не придётся его чинить, когда ролей станет три.
    Иначе последний админ разжалует сам себя и вернуть админку можно будет
    только скриптом `npm run make-admin`.
  */
  if (userId === session.user.id) return;

  /*
    `updateMany`, а не `update`: второй бросает P2025 на исчезнувшей строке,
    а у void-формы нет места под ошибку — вместо списка человек увидел бы
    страницу ошибки Next. Здесь пропавший пользователь просто ничего
    не меняет.
  */
  await prisma.user.updateMany({ where: { id: userId }, data: { role } });

  revalidatePath("/admin/users");
}

export async function deleteUserAsAdmin(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const userId = formData.get("userId");
  const confirmUsername = formData.get("confirmUsername");
  if (typeof userId !== "string") return;

  // Себя не удаляем — админка осталась бы без входа.
  if (userId === session.user.id) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true },
  });
  if (!user) return;

  /*
    Другого админа — только разжаловав. Лишний шаг здесь дешевле, чем
    случайно снесённый коллега: восстановления нет, аккаунт уходит вместе
    со всем, что он написал.
  */
  if (user.role === ADMIN_ROLE) return;

  /*
    Сверка ника — ЗДЕСЬ, а не на странице подтверждения: страница это UI,
    а экшен это публичный POST, и в него приходят прямо, минуя форму.
    Сравнение без учёта регистра: ник уникален и в форме `signup` ограничен
    латиницей, так что «ZeroneR» и «zeroner» — заведомо один человек,
    а придираться к регистру на страшной форме незачем.
  */
  const typed = typeof confirmUsername === "string" ? confirmUsername.trim() : "";
  if (typed.toLowerCase() !== user.username.toLowerCase()) {
    redirect(`/admin/users/${userId}/delete?error=confirm`);
  }

  /*
    Аватар лежит в бакете Supabase по пути, равному userId, — каскад базы
    туда не дотягивается, и без этой строки файл остался бы сиротой навсегда.
    Ошибку глотаем: недоступное хранилище не повод оставить аккаунт живым,
    а лишний файл в бакете безвреден. Try/catch тут безопасен — redirect
    ниже, вне блока.
  */
  try {
    await supabase.storage.from("avatars").remove([userId]);
  } catch {
    // Файла могло и не быть — аватар необязателен.
  }

  /*
    Один delete уносит всё: записи (а с ними чужие комментарии и лайки),
    свои комментарии и лайки, подписки в обе стороны, заявки, дружбы,
    диалоги (а с ними чужие сообщения), сессии и аккаунты. Всё это описано
    в схеме как onDelete: Cascade, так что руками ничего доудалять не надо —
    и, что важнее, нельзя: ручная зачистка разъехалась бы со схемой при
    первой же новой связи.
  */
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/comments");
  revalidatePath("/");
  /*
    Тип "layout" на литеральном пути: гасим не только страницу дневника,
    но и все вложенные — страницы его записей, список друзей, RSS. Иначе
    из клиентского Router Cache браузер показал бы запись человека,
    которого уже нет.

    Чего этим НЕ достать: страниц суток `/day/<дата>`, где лежали его
    записи. Перечислить их можно было бы, собрав даты до удаления, но их
    столько же, сколько дней он писал, — а страница /day и так динамическая
    и пересоберётся при первом заходе с сервера.
  */
  revalidatePath(`/u/${user.username}`, "layout");

  redirect("/admin/users");
}

/**
 * Разбор жалобы: перевод в `resolved`/`dismissed` (и обратно в `open`, если
 * решение хочется отменить).
 *
 * Удаления самой жалобы нет: закрытая жалоба — это история разбора. А если
 * модератор сносит сам объект, жалоба уходит каскадом и без этого экшена —
 * поэтому `resolved` тут редкий гость, он для «претензия по делу, но удалять
 * не буду».
 */
export async function resolveReport(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) return;

  const reportId = formData.get("reportId");
  const status = formData.get("status");
  if (typeof reportId !== "string") return;

  // Тот же довод, что у белого списка ролей: статус приезжает скрытым полем
  // формы. Enum'а в базе нет, так что эта проверка — единственная.
  if (!isReportStatus(status)) return;

  await prisma.report.updateMany({
    where: { id: reportId },
    data: {
      status,
      // Дата разбора ставится один раз и снимается при возврате в `open` —
      // иначе «закрыто такого-то» осталось бы висеть на открытой жалобе.
      resolvedAt: status === REPORT_STATUS.open ? null : new Date(),
    },
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
