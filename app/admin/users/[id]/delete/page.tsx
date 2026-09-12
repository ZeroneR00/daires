import Link from "next/link";
import { notFound } from "next/navigation";
import { ADMIN_ROLE, requireAdmin } from "@/lib/admin";
import { getUserForDeletion } from "@/lib/admin-queries";
import { formatPostDate } from "@/lib/format-date";
import { field, pillButtonPrimary } from "@/lib/ui";
import { Avatar } from "@/components/Avatar";
import { deleteUserAsAdmin } from "@/app/admin/actions";

/*
  Подтверждение удаления пользователя — самая разрушительная кнопка проекта.

  Отдельная страница здесь по той же причине, что и у записи, только с двумя
  усилениями.

  Первое: ввод ника руками. Приём из GitHub, и берём мы его не ради строгости,
  а ради паузы — набирая чужой ник, человек перечитывает, кого именно сносит.
  Механически это ещё и защита от «промахнулся строкой в списке»: подтвердить
  не тот аккаунт можно, только напечатав чужой ник целиком. Проверка живёт
  в экшене, поле — просто повод её пройти.

  Второе: страница называет числами ВЕСЬ каскад, включая чужое. Пункты
  «чужих комментариев» и «чужих сообщений» — не украшение: они говорят то,
  чего из интерфейса не видно, — удаление задевает людей, которые тут ни при
  чём. Без этой строки модератор считает, что убирает одного человека.

  Оба запрета (себя, другого админа) показаны текстом, а не пустотой: молча
  спрятанная форма читалась бы как поломка.
*/

export const dynamic = "force-dynamic";

interface DeleteUserPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function DeleteUserPage({
  params,
  searchParams,
}: DeleteUserPageProps) {
  const session = await requireAdmin();

  const { id } = await params;
  const user = await getUserForDeletion(id);
  if (!user) notFound();

  const isSelf = user.id === session.user.id;
  const isAdmin = user.role === ADMIN_ROLE;
  const blocked = isSelf || isAdmin;

  const { error } = await searchParams;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Avatar url={user.avatarUrl} size={48} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-serif text-xl text-ink">Удалить пользователя?</h2>
          <p className="truncate text-sm text-muted">
            <span className="text-ink">{user.name}</span> @{user.username} ·{" "}
            {user.email}
          </p>
          <p className="text-xs text-muted">
            С нами с {formatPostDate(user.createdAt)}
          </p>
        </div>
      </header>

      {isSelf && (
        <p className="text-sm text-danger">
          Себя удалить нельзя — админка осталась бы без входа.
        </p>
      )}

      {!isSelf && isAdmin && (
        <p className="text-sm text-danger">
          Это администратор. Сначала сними роль в списке пользователей —
          отдельный шаг здесь нарочно.
        </p>
      )}

      <div className="flex flex-col gap-3 text-sm text-muted">
        <p>Вместе с аккаунтом исчезнут его:</p>
        <ul className="list-inside list-disc">
          <li>записей: {user.posts}</li>
          <li>комментариев: {user.ownComments}</li>
          <li>лайков: {user.ownLikes}</li>
          <li>
            подписок: {user.following} · подписчиков: {user.followers}
          </li>
          <li>
            дружб: {user.friendships} · заявок: {user.friendRequests}
          </li>
          <li>
            диалогов: {user.conversations} · его сообщений: {user.ownMessages}
          </li>
          <li>
            сессий: {user.sessions} · привязанных аккаунтов: {user.accounts}
          </li>
        </ul>

        {/*
          Второй список отделён от первого нарочно: это цена, которую платят
          посторонние. Числа берутся не из связей пользователя, а через его
          записи и диалоги — то есть считаются отдельными запросами, см.
          `getUserForDeletion`.
        */}
        <p>И вместе с ними — чужое:</p>
        <ul className="list-inside list-disc">
          <li>чужих комментариев под его записями: {user.foreignComments}</li>
          <li>чужих лайков на его записях: {user.foreignLikes}</li>
          <li>чужих сообщений в общих с ним диалогах: {user.foreignMessages}</li>
        </ul>

        <p>
          Треки останутся в базе — это кэш метаданных, а не часть записей.
          Фотография профиля из хранилища удалится вместе с аккаунтом.
        </p>
        <p>Отменить это нельзя: восстановления нет.</p>
      </div>

      {blocked ? (
        <Link
          href="/admin/users"
          className="text-sm text-muted transition-colors hover:text-accent"
        >
          ← К списку пользователей
        </Link>
      ) : (
        <form action={deleteUserAsAdmin} className="flex flex-col gap-3">
          <input type="hidden" name="userId" value={user.id} />

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {/*
              Фраза завёрнута в один <span> нарочно: label здесь — flex-колонка,
              и голый текст рядом с вложенным <span> стал бы вторым элементом
              колонки, то есть ник уехал бы на свою строку и прочитался бы
              как подпись поля, а не как часть предложения.
            */}
            <span>
              Чтобы подтвердить, введи ник{" "}
              <span className="text-ink">{user.username}</span>
            </span>
            <input
              type="text"
              name="confirmUsername"
              autoComplete="off"
              // Ник латиницей: подсказки телефона тут только мешают.
              autoCapitalize="off"
              spellCheck={false}
              className={`${field} max-w-xs`}
            />
          </label>

          {/*
            Ошибка приезжает query-параметром после редиректа из экшена:
            у void-формы своего места под ответ нет, а молчание было бы
            неотличимо от поломки. `text-danger` — тот же токен, что у
            ошибок форм проекта.
          */}
          {error === "confirm" && (
            <p className="text-sm text-danger">
              Ник не совпал — аккаунт на месте. Проверь и попробуй ещё раз.
            </p>
          )}

          <div className="flex items-center gap-4">
            <button type="submit" className={pillButtonPrimary}>
              Удалить пользователя
            </button>
            {/* «Отмена» ссылкой: залитая кнопка на экране ровно одна. */}
            <Link
              href="/admin/users"
              className="text-sm text-muted transition-colors hover:text-accent"
            >
              Отмена
            </Link>
            <Link
              href={`/u/${user.username}`}
              className="ml-auto text-sm text-muted transition-colors hover:text-accent"
            >
              Открыть дневник
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
