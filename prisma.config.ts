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
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
