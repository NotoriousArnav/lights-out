import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'

import type { Db } from '../src/server/db/client'
import { createDb, migrateDb } from '../src/server/db/client'
import {
  DuplicateScoreError,
  countPlayers,
  getLeaderboard,
  getPlayerPlace,
  insertScore,
  upsertUser,
} from '../src/server/db/scores'

let db: Db

function addUser(id: string, name: string) {
  upsertUser(db, {
    id,
    username: null,
    displayName: name,
    imageUrl: null,
  })
}

function addScore(
  id: string,
  userId: string,
  overrides: Partial<Parameters<typeof insertScore>[1]> = {},
) {
  insertScore(db, {
    id,
    userId,
    size: 4,
    moves: 5,
    hints: 0,
    elapsedMs: 30_000,
    score: 9_800,
    jti: `jti-${id}`,
    createdAtMs: 1_700_000_000_000,
    ...overrides,
  })
}

beforeEach(() => {
  db = createDb(':memory:')
  migrateDb(db)
})

describe('leaderboard', () => {
  beforeEach(() => {
    addUser('alice', 'Alice')
    addUser('bob', 'Bob')
    addUser('carol', 'Carol')

    // Bob and Alice tie on points; fewer moves wins the tie-break.
    addScore('a-worse', 'alice', {
      moves: 8,
      score: 9_500,
      createdAtMs: 1_700_000_000_100,
    })
    addScore('a-best', 'alice', {
      moves: 5,
      score: 10_000,
      createdAtMs: 1_700_000_000_200,
    })
    addScore('b-best', 'bob', {
      moves: 4,
      score: 10_000,
      createdAtMs: 1_700_000_000_300,
    })
    addScore('c-best', 'carol', {
      moves: 9,
      score: 5_000,
      createdAtMs: 1_700_000_000_400,
    })

    // Other sizes are ranked separately.
    addScore('c-small', 'carol', {
      size: 3,
      moves: 6,
      score: 9_000,
    })
  })

  it('shows one best row per player, ranked', () => {
    const rows = getLeaderboard(db, 4, 25, 0)

    expect(rows.map((row) => row.userId)).toEqual(['bob', 'alice', 'carol'])
    expect(rows.map((row) => row.place)).toEqual([1, 2, 3])
    expect(rows.map((row) => row.score)).toEqual([10_000, 10_000, 5_000])
    expect(rows.map((row) => row.displayName)).toEqual(['Bob', 'Alice', 'Carol'])
    expect(rows[1]!.moves).toBe(5)
  })

  it('paginates without changing the ranks', () => {
    const first = getLeaderboard(db, 4, 2, 0)
    const second = getLeaderboard(db, 4, 2, 2)

    expect(first.map((row) => row.place)).toEqual([1, 2])
    expect(second.map((row) => row.place)).toEqual([3])
    expect(second[0]!.userId).toBe('carol')
  })

  it('counts players per size', () => {
    expect(countPlayers(db, 4)).toBe(3)
    expect(countPlayers(db, 3)).toBe(1)
    expect(countPlayers(db, 5)).toBe(0)
  })

  it('finds a player place', () => {
    expect(getPlayerPlace(db, 4, 'bob')).toBe(1)
    expect(getPlayerPlace(db, 4, 'alice')).toBe(2)
    expect(getPlayerPlace(db, 4, 'carol')).toBe(3)
    expect(getPlayerPlace(db, 4, 'nobody')).toBeNull()
  })

  it('falls back to a generic name when the profile is missing', () => {
    addScore('ghost', 'ghost')
    const row = getLeaderboard(db, 4, 25, 0).find((entry) => entry.userId === 'ghost')
    expect(row?.displayName).toBe('Player')
  })
})

describe('score storage', () => {
  it('rejects a replay of the same game token', () => {
    addUser('alice', 'Alice')
    addScore('first', 'alice')

    expect(() => addScore('second', 'alice', { jti: 'jti-first' })).toThrow(
      DuplicateScoreError,
    )
  })

  it('keeps every verified run in the table', () => {
    addUser('alice', 'Alice')
    addScore('one', 'alice', { jti: 'jti-one', score: 9_000 })
    addScore('two', 'alice', { jti: 'jti-two', score: 9_500 })

    const row = db.get<{ total: number }>(sql`SELECT COUNT(*) AS total FROM scores`)
    expect(Number(row?.total)).toBe(2)
  })

  it('updates a returning player profile', () => {
    addUser('alice', 'Alice')
    addUser('alice', 'Alice Updated')
    addScore('run', 'alice')

    expect(getLeaderboard(db, 4, 25, 0)[0]!.displayName).toBe('Alice Updated')
  })
})
