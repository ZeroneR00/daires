import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js-конвенция — секреты лежат в .env.local, а не в .env
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-команды (migrate/db push/studio) должны ходить через session pooler,
    // не через transaction pooler (DATABASE_URL) — тот не гарантирует поддержку
    // операций уровня сессии, нужных миграциям. `directUrl` в реальном типе
    // Datasource из @prisma/config не существует (только url/shadowDatabaseUrl),
    // так что раньше это поле тихо игнорировалось.
    url: env("DIRECT_URL"),
  },
});
