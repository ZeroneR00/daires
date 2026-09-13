import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  /*
    Свой адрес Better Auth должен знать точно: им подписываются куки и по нему
    же проверяется origin запроса на вход. Одной строки (или одной переменной
    `BETTER_AUTH_URL`) хватило бы на прод, но не на Vercel: каждая ветка
    получает preview-деплой на собственном адресе вида
    `daires-git-<ветка>-<аккаунт>.vercel.app`, и захардкоженный прод-адрес
    отклонял бы вход на всех превью разом.

    Поэтому объект, а не строка. Хост берётся из самого запроса и сверяется
    с этим белым списком — механика заведена в Better Auth именно под
    preview-деплои, шаблон `*.vercel.app` стоит примером в её же докстринге.
    Даром достаётся и проверка origin: `getTrustedOrigins` разворачивает
    `allowedHosts` в список доверенных origin'ов сам, так что `trustedOrigins`
    отдельно объявлять не надо (проверено по коду пакета, 1.6.26).

    `fallback` — то, чем живёт локальная разработка: `localhost:3000` под
    шаблон не попадает, и адрес берётся из `BETTER_AUTH_URL` в `.env.local`,
    как было до деплоя. На проде эта переменная тоже выставлена — она же
    канонический адрес сайта, и она же страховка, если хост из запроса
    почему-то не вычислится.

    Шаблон сужен до имени проекта, а не оставлен на весь `*.vercel.app`:
    адреса Vercel всегда начинаются с имени проекта (`daires.vercel.app` —
    прод, `daires-git-<ветка>-<аккаунт>.vercel.app` — превью). Проверено
    запросом с подставным `Origin: https://evil.vercel.app` — со списком на
    весь `*.vercel.app` вход его принимал, с этим отвергает. Остаток риска:
    имена на `vercel.app` глобальные, и посторонний в принципе может занять
    проект `daires-<что-то>`; но кука стоит `SameSite=Lax`, и на межсайтовый
    POST браузер её не пошлёт — проверка origin здесь второй рубеж, не
    единственный.

    **Имя проекта в Vercel обязано быть `daires`** (Vercel и предложит его
    сам — по имени репозитория). Назовёшь иначе — поправить строки ниже,
    иначе вход на проде уедет на `fallback` и превью перестанут пускать.
    Появится свой домен — дописать его сюда же отдельной строкой.
  */
  baseURL: {
    allowedHosts: ["daires.vercel.app", "daires-*.vercel.app"],
    fallback: process.env.BETTER_AUTH_URL,
  },
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
        validator: {
          input: z
            .string()
            .min(3)
            .max(30)
            .regex(/^[a-zA-Z0-9_-]+$/, "only letters, digits, - and _ are allowed"),
        },
      },
      /*
        Роль объявлена здесь только ради одного: чтобы она приезжала в
        `session.user` и её мог прочитать гард в `lib/admin.ts`.

        `input: false` — ключевая часть строки, а не оптимизация: без него
        роль стала бы обычным полем формы, и любой мог бы прислать
        `role: "admin"` в signup или updateUser. `returned` при этом не
        трогаем — поле обязано доезжать до сессии.

        `defaultValue` тут — страховка на случай, если пользователь заведётся
        мимо дефолта колонки. На тип это не влияет: при `required: false`
        Better Auth выводит `string | null | undefined`, и гард в `lib/admin.ts`
        поэтому написан сравнением, а не разыменованием (проверено tsc'ом
        2026-09-09).
      */
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
});
