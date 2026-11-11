// Prisma 7 reads its settings from this file (not from package.json or the schema's datasource block).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Not env("DATABASE_URL"): that throws when the variable is missing, which would break `npm install`
    // (postinstall runs `prisma generate`, which needs no database). Migrations still fail loudly without it.
    // Migrations use the direct connection when Neon provides one (pooled connections break migration locks);
    // the app itself always uses DATABASE_URL (src/lib/server/db.ts).
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
