import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'

import type { Size } from '../../game/types'
import * as schema from './schema.pg'
import {
  DuplicateScoreError,
  type LeaderboardEntry,
  type NewScore,
  type PlayerProfile,
  type ScoreStore,
} from './store'

interface RawLeaderboardRow {
  user_id: string
  display_name: string | null
  image_url: string | null
  moves: number | string
  hints: number | string
  elapsed_ms: number | string
  score: number | string
  place: number | string
}

function toEntry(row: RawLeaderboardRow): LeaderboardEntry {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? 'Player',
    imageUrl: row.image_url,
    moves: Number(row.moves),
    hints: Number(row.hints),
    elapsedMs: Number(row.elapsed_ms),
    score: Number(row.score),
    place: Number(row.place),
  }
}

async function leaderboardRows(
  db: ReturnType<typeof drizzle<typeof schema>>,
  size: Size,
  limit: number,
  offset: number,
): Promise<RawLeaderboardRow[]> {
  const result = await db.execute(sql`
    WITH per_player AS (
      SELECT s.*,
        ROW_NUMBER() OVER (
          PARTITION BY s.user_id
          ORDER BY s.score DESC, s.moves ASC, s.hints ASC, s.elapsed_ms ASC, s.created_at_ms ASC
        ) AS rn
      FROM scores s
      WHERE s.size = ${size}
    ),
    best AS (
      SELECT * FROM per_player WHERE rn = 1
    ),
    ranked AS (
      SELECT b.*,
        ROW_NUMBER() OVER (
          ORDER BY b.score DESC, b.moves ASC, b.hints ASC, b.elapsed_ms ASC, b.created_at_ms ASC
        ) AS place
      FROM best b
    )
    SELECT
      r.user_id,
      u.display_name,
      u.image_url,
      r.moves,
      r.hints,
      r.elapsed_ms,
      r.score,
      r.place
    FROM ranked r
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.place
    LIMIT ${limit} OFFSET ${offset}
  `)

  return result.rows as unknown as RawLeaderboardRow[]
}

async function playersCount(
  db: ReturnType<typeof drizzle<typeof schema>>,
  size: Size,
): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM (
      SELECT user_id FROM scores WHERE size = ${size} GROUP BY user_id
    ) counts
  `)
  const row = result.rows[0] as { total: number | string } | undefined
  return Number(row?.total ?? 0)
}

async function playerPlace(
  db: ReturnType<typeof drizzle<typeof schema>>,
  size: Size,
  userId: string,
): Promise<number | null> {
  const result = await db.execute(sql`
    WITH per_player AS (
      SELECT s.*,
        ROW_NUMBER() OVER (
          PARTITION BY s.user_id
          ORDER BY s.score DESC, s.moves ASC, s.hints ASC, s.elapsed_ms ASC, s.created_at_ms ASC
        ) AS rn
      FROM scores s
      WHERE s.size = ${size}
    ),
    best AS (
      SELECT * FROM per_player WHERE rn = 1
    ),
    ranked AS (
      SELECT b.user_id,
        ROW_NUMBER() OVER (
          ORDER BY b.score DESC, b.moves ASC, b.hints ASC, b.elapsed_ms ASC, b.created_at_ms ASC
        ) AS place
      FROM best b
    )
    SELECT place FROM ranked WHERE user_id = ${userId}
  `)
  const row = result.rows[0] as { place: number | string } | undefined
  return row ? Number(row.place) : null
}

export function createPostgresStore(url: string): ScoreStore {
  const client = neon(url)
  const db = drizzle({ client, schema })

  return {
    async upsertUser(profile: PlayerProfile) {
      const updatedAtMs = Date.now()
      await db
        .insert(schema.users)
        .values({
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          imageUrl: profile.imageUrl,
          updatedAtMs,
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            username: profile.username,
            displayName: profile.displayName,
            imageUrl: profile.imageUrl,
            updatedAtMs,
          },
        })
    },

    async insertScore(run: NewScore) {
      const inserted = await db
        .insert(schema.scores)
        .values({
          id: run.id,
          userId: run.userId,
          size: run.size,
          moves: run.moves,
          hints: run.hints,
          elapsedMs: run.elapsedMs,
          score: run.score,
          jti: run.jti,
          createdAtMs: run.createdAtMs,
        })
        .onConflictDoNothing({ target: schema.scores.jti })
        .returning({ id: schema.scores.id })

      if (inserted.length === 0) {
        throw new DuplicateScoreError()
      }
    },

    async getLeaderboard(size, limit, offset) {
      const rows = await leaderboardRows(db, size, limit, offset)
      return rows.map(toEntry)
    },

    async countPlayers(size) {
      return playersCount(db, size)
    },

    async getPlayerPlace(size, userId) {
      return playerPlace(db, size, userId)
    },
  }
}
