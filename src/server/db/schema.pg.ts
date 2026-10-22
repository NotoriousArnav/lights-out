import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * Production schema. It mirrors the SQLite development schema column for
 * column, with epoch milliseconds stored as bigint because Postgres integers
 * are only 32-bit.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username'),
  displayName: text('display_name').notNull(),
  imageUrl: text('image_url'),
  updatedAtMs: bigint('updated_at_ms', { mode: 'number' }).notNull(),
})

export const scores = pgTable(
  'scores',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    size: integer('size').notNull(),
    moves: integer('moves').notNull(),
    hints: integer('hints').notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    score: integer('score').notNull(),
    jti: text('jti').notNull(),
    createdAtMs: bigint('created_at_ms', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('scores_jti_idx').on(table.jti),
    index('scores_size_idx').on(table.size),
    index('scores_user_size_idx').on(table.userId, table.size),
  ],
)

export type UserRow = typeof users.$inferSelect
export type ScoreRow = typeof scores.$inferSelect
