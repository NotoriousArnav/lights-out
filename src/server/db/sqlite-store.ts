import type { Db } from './client'
import {
  countPlayers,
  getLeaderboard,
  getPlayerPlace,
  insertScore,
  upsertUser,
} from './scores'
import type { ScoreStore } from './store'

export function createSqliteStore(db: Db): ScoreStore {
  return {
    async upsertUser(profile) {
      upsertUser(db, profile)
    },
    async insertScore(run) {
      insertScore(db, run)
    },
    async getLeaderboard(size, limit, offset) {
      return getLeaderboard(db, size, limit, offset)
    },
    async countPlayers(size) {
      return countPlayers(db, size)
    },
    async getPlayerPlace(size, userId) {
      return getPlayerPlace(db, size, userId)
    },
  }
}
