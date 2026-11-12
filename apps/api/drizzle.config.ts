import { defineConfig } from "drizzle-kit";

// Migrations are kept as code so they can be re-run on Neon (architecture.md 14.1). Locally,
// DATABASE_URL points at the Docker database (see .dev.vars.example).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke",
  },
  strict: true,
});
