import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
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
