import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * SQLite is the development database. The production Postgres schema will
 * mirror these columns exactly; keep the snake_case names stable so the raw
 * leaderboard query stays portable.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username'),
  displayName: text('display_name').notNull(),
  imageUrl: text('image_url'),
  updatedAtMs: integer('updated_at_ms').notNull(),
})

export const scores = sqliteTable(
  'scores',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    size: integer('size').notNull(),
    moves: integer('moves').notNull(),
    hints: integer('hints').notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    score: integer('score').notNull(),
    jti: text('jti').notNull(),
    createdAtMs: integer('created_at_ms').notNull(),
  },
  (table) => [
    uniqueIndex('scores_jti_idx').on(table.jti),
    index('scores_size_idx').on(table.size),
    index('scores_user_size_idx').on(table.userId, table.size),
  ],
)

export type UserRow = typeof users.$inferSelect
export type ScoreRow = typeof scores.$inferSelect
