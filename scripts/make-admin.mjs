/*
  Разовый скрипт: выдать (или снять) роль администратора.

  Зачем скрипт вообще: роль нельзя выставить через интерфейс — в `lib/auth.ts`
  у поля `role` стоит `input: false`, иначе кто угодно прислал бы себе
  `role: "admin"` при регистрации. Значит первому админу роль ставится
  снаружи приложения, а дальше он раздаёт её остальным из самой админки.

  Аварийный путь, если скрипт почему-то не идёт: `npx prisma studio` →
  таблица `user` → поле `role` руками.

  Использование:
    npm run make-admin <username>
    npm run make-admin <username> -- --revoke

  Голый `pg`, а не Prisma Client: это разовая CLI-утилита вне Next, и
  тащить сюда генерацию клиента незачем. `pg` и `dotenv` уже прямые
  зависимости проекта — устанавливать ничего не надо.
*/

import { config } from "dotenv";
import pg from "pg";

// Скрипт выполняется вне Next.js, а `.env.local` подхватывает только рантайм
// Next — здесь его надо загрузить явно (та же причина, что в prisma.config.ts).
config({ path: ".env.local" });

const ADMIN_ROLE = "admin";
const USER_ROLE = "user";

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const username = args.find((arg) => !arg.startsWith("--"));

if (!username) {
  console.error("Использование: npm run make-admin <username> [-- --revoke]");
  process.exit(1);
}

// DIRECT_URL (session pooler), а не DATABASE_URL: это CLI-тулинг, ему нужен
// тот же прямой путь в базу, что и миграциям, — см. prisma.config.ts.
const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("В .env.local нет DIRECT_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();

  // Сначала показываем, кого нашли, и только потом меняем: username в базе
  // уникален, но опечатка в аргументе не должна молча выдавать права
  // не тому человеку.
  const found = await client.query(
    'SELECT "id", "username", "name", "email", "role" FROM "user" WHERE "username" = $1',
    [username],
  );

  if (found.rowCount === 0) {
    console.error(`Пользователь "${username}" не найден`);
    process.exit(1);
  }

  const user = found.rows[0];
  console.log(
    `Найден: ${user.username} (${user.name}, ${user.email}) — текущая роль: ${user.role}`,
  );

  const nextRole = revoke ? USER_ROLE : ADMIN_ROLE;
  if (user.role === nextRole) {
    console.log(`Роль уже "${nextRole}", менять нечего.`);
    process.exit(0);
  }

  await client.query('UPDATE "user" SET "role" = $1 WHERE "id" = $2', [
    nextRole,
    user.id,
  ]);
  console.log(`Готово: роль изменена на "${nextRole}".`);
} finally {
  await client.end();
}
