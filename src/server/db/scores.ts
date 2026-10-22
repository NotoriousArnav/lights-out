import { sql } from 'drizzle-orm'

import type { Size } from '../../game/types'
import type { Db } from './client'
import { scores, users } from './schema'
import {
  DuplicateScoreError,
  type LeaderboardEntry,
  type NewScore,
  type PlayerProfile,
} from './store'

export { DuplicateScoreError }
export type { LeaderboardEntry, NewScore, PlayerProfile }

export function upsertUser(db: Db, profile: PlayerProfile): void {
  const updatedAtMs = Date.now()
  db.insert(users)
    .values({
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      imageUrl: profile.imageUrl,
      updatedAtMs,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        username: profile.username,
        displayName: profile.displayName,
        imageUrl: profile.imageUrl,
        updatedAtMs,
      },
    })
    .run()
}

export function insertScore(db: Db, run: NewScore): void {
  try {
    db.insert(scores)
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
      .run()
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new DuplicateScoreError()
    }
    throw error
  }
}

interface RawLeaderboardRow {
  user_id: string
  display_name: string | null
  image_url: string | null
  moves: number
  hints: number
  elapsed_ms: number
  score: number
  place: number
}

function toEntry(row: RawLeaderboardRow): LeaderboardEntry {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? 'Player',
    imageUrl: row.image_url,
    moves: row.moves,
    hints: row.hints,
    elapsedMs: row.elapsed_ms,
    score: row.score,
    place: row.place,
  }
}

/**
 * One row per player: their best verified run for the size. The CTE and
 * window functions are supported by both SQLite (3.25+) and Postgres, which
 * keeps the production adapter a driver swap rather than a rewrite.
 */
export function getLeaderboard(
  db: Db,
  size: Size,
  limit: number,
  offset: number,
): LeaderboardEntry[] {
  const rows = db.all<RawLeaderboardRow>(sql`
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

  return rows.map(toEntry)
}

export function countPlayers(db: Db, size: Size): number {
  const row = db.get<{ total: number }>(sql`
    SELECT COUNT(*) AS total
    FROM (
      SELECT user_id FROM scores WHERE size = ${size} GROUP BY user_id
    )
  `)
  return Number(row?.total ?? 0)
}

export function getPlayerPlace(db: Db, size: Size, userId: string): number | null {
  const row = db.get<{ place: number }>(sql`
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
  return row ? Number(row.place) : null
}
