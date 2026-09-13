"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { normalizePair } from "@/lib/friends";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

/*
  Эталон демо-аккаунта — ровно то, что было посеяно 2026-09-13: подписан на
  двух персонажей, дружит со Львом, и от Льва ждёт одно непрочитанное
  сообщение (чтобы гость сразу увидел живую точку в шапке и раздел «Сообщения»).

  Даты зашиты, а не `new Date()`: сообщение, которое при каждом входе
  приходит «только что», читалось бы подделкой.

  Персонажи ищутся по нику — это наши собственные витринные аккаунты. Если
  кого-то из них не станет, сброс не падает, а просто посеет меньше.
*/
const DEMO_PROFILE = {
  name: "Гость",
  username: "demo",
  bio: "Демо-аккаунт для знакомства с сайтом. Пишите смело — всё, что здесь появится, время от времени убирается.",
  avatarUrl: null,
  image: null,
};
const DEMO_FOLLOWS = ["kirill_v", "lev_tishe"];
const DEMO_FRIEND = "lev_tishe";
const FOLLOWED_AT = new Date("2026-08-10T14:00:00Z");
const BEFRIENDED_AT = new Date("2026-09-02T07:00:00Z");
const WELCOME_SENT_AT = new Date("2026-09-10T13:00:00Z");
const WELCOME_TEXT =
  "Привет! Раз уж ты здесь — посоветуй что-нибудь, чего я точно не слышал. Отвечать можно прямо тут 🙂";

/**
 * Возвращает демо-аккаунт к эталону. Зовётся кнопкой «Войти как гость»
 * перед самим входом — так каждый гость получает чистый аккаунт, а не то,
 * что оставил предыдущий. Расписания (cron) нет сознательно: уборка
 * случается ровно тогда, когда она кому-то нужна.
 *
 * Цена, принятая при выборе: мусор прошлого гостя виден в ленте, пока не
 * придёт следующий; двое гостей одновременно сбрасывают друг друга.
 *
 * Гарда на сессию нет и быть не может — экшен зовёт аноним. Это публичный
 * POST, и дёрнуть его может кто угодно; худшее, что он сделает, — сбросит
 * демо лишний раз. Чужие аккаунты он не трогает: всё ниже привязано к id,
 * найденному по `DEMO_EMAIL`.
 */
export async function resetDemoAccount(): Promise<{ error: string } | { success: true }> {
  /*
    По email, а не по нику: ник гость может сменить сам (Better Auth пускает
    `username` в updateUser), а смена email в `lib/auth.ts` не включена.
  */
  const demo = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, avatarUrl: true },
  });
  if (!demo) {
    return { error: "Демо-аккаунт сейчас недоступен" };
  }

  const characters = await prisma.user.findMany({
    where: { username: { in: DEMO_FOLLOWS } },
    select: { id: true, username: true },
  });
  const friend = characters.find((user) => user.username === DEMO_FRIEND);

  /*
    Пароль восстанавливается при каждом сбросе. `change-password` у Better
    Auth — публичный эндпоинт без всякой кнопки в интерфейсе, а текущий
    пароль демо знает любой гость: без этой строки один шутник запер бы
    аккаунт для всех следующих.

    Хеш считается до транзакции: scrypt нарочно медленный, и держать ради
    него соединение из пула незачем. Та же функция, которой Better Auth
    хеширует пароли сам, — иначе вход не сошёлся бы.
  */
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // Аватар — вне базы, каскад до бакета не дотянется (путь = userId).
  if (demo.avatarUrl) {
    try {
      await supabase.storage.from("avatars").remove([demo.id]);
    } catch {
      // Лишний файл в бакете безвреден, не повод не пустить гостя.
    }
  }

  const id = demo.id;

  try {
    await prisma.$transaction(async (tx) => {
      /*
        Сначала снести всё, потом посеять заново — а не вычислять, что гость
        добавил. Разницу посчитать нельзя: гость мог и убрать посеянное
        (разорвать дружбу, прочитать сообщение), и тогда «удалить новое»
        оставило бы аккаунт пустым.

        Записи уносят каскадом свои треки-связи, чужие комментарии, лайки и
        жалобы на них; диалоги — все сообщения в них, в том числе чужие.
      */
      await tx.post.deleteMany({ where: { authorId: id } });
      await tx.comment.deleteMany({ where: { authorId: id } });
      await tx.like.deleteMany({ where: { userId: id } });
      await tx.report.deleteMany({ where: { reporterId: id } });
      await tx.follow.deleteMany({ where: { OR: [{ followerId: id }, { followingId: id }] } });
      await tx.friendRequest.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await tx.friendship.deleteMany({ where: { OR: [{ userAId: id }, { userBId: id }] } });
      await tx.conversation.deleteMany({ where: { OR: [{ userAId: id }, { userBId: id }] } });

      /*
        Живые сессии не трогаем: гость, который прямо сейчас внутри, не должен
        вылететь из-за того, что пришёл второй. Чистим только истёкшие — иначе
        каждый вход копил бы в таблице по строке.
      */
      await tx.session.deleteMany({ where: { userId: id, expiresAt: { lt: new Date() } } });

      /*
        Упадёт на уникальности `username`, если гость сменил ник, а «demo»
        успел занять кто-то другой. Тогда сброс честно отдаёт ошибку —
        это разбирается руками, угадывать новый ник экшен не должен.
      */
      await tx.user.update({ where: { id }, data: DEMO_PROFILE });
      await tx.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password: passwordHash },
      });

      await tx.follow.createMany({
        data: characters.map((character) => ({
          followerId: id,
          followingId: character.id,
          createdAt: FOLLOWED_AT,
        })),
      });

      if (friend) {
        const [userAId, userBId] = normalizePair(id, friend.id);
        await tx.friendship.create({ data: { userAId, userBId, createdAt: BEFRIENDED_AT } });

        // Лев своё сообщение «прочитал», гость — нет: отсюда точка в шапке.
        await tx.conversation.create({
          data: {
            userAId,
            userBId,
            createdAt: WELCOME_SENT_AT,
            lastMessageAt: WELCOME_SENT_AT,
            userALastReadAt: userAId === friend.id ? WELCOME_SENT_AT : null,
            userBLastReadAt: userBId === friend.id ? WELCOME_SENT_AT : null,
            messages: {
              create: { senderId: friend.id, text: WELCOME_TEXT, createdAt: WELCOME_SENT_AT },
            },
          },
        });
      }
    });
  } catch {
    return { error: "Не удалось подготовить демо-аккаунт, попробуй ещё раз" };
  }

  /*
    Весь сайт, а не список адресов: записи гостя могли лечь в ленту, на
    страницы суток и в поиск, а у персонажей поменялись счётчики подписчиков
    и друзей. Перечислять это поштучно — гарантированно что-то забыть.
  */
  revalidatePath("/", "layout");

  return { success: true };
}
