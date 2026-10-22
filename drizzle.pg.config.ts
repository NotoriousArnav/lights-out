import { defineConfig } from 'drizzle-kit'

/**
 * Postgres migrations use the direct Neon connection when available. The
 * pooled URL is for the running app; schema changes should bypass the pooler.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.pg.ts',
  out: './drizzle-pg',
  dbCredentials: {
    url:
      process.env.DIRECT_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://localhost:5432/lightsout',
  },
})
