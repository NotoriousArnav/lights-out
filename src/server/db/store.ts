import type { Size } from '../../game/types'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  imageUrl: string | null
  moves: number
  hints: number
  elapsedMs: number
  score: number
  place: number
}

export interface NewScore {
  id: string
  userId: string
  size: Size
  moves: number
  hints: number
  elapsedMs: number
  score: number
  jti: string
  createdAtMs: number
}

export interface PlayerProfile {
  id: string
  username: string | null
  displayName: string
  imageUrl: string | null
}

export class DuplicateScoreError extends Error {
  constructor() {
    super('This game has already been submitted')
    this.name = 'DuplicateScoreError'
  }
}

/**
 * The small persistence surface the game needs. SQLite backs local
 * development and the Postgres adapter backs the deployed app. Keeping the
 * interface async means both drivers can implement it without leaking their
 * query APIs into the server functions.
 */
export interface ScoreStore {
  upsertUser(profile: PlayerProfile): Promise<void>
  insertScore(run: NewScore): Promise<void>
  getLeaderboard(
    size: Size,
    limit: number,
    offset: number,
  ): Promise<LeaderboardEntry[]>
  countPlayers(size: Size): Promise<number>
  getPlayerPlace(size: Size, userId: string): Promise<number | null>
}
