import { randomInt, randomUUID } from 'node:crypto'

import { createServerFn } from '@tanstack/react-start'

import type { Size } from '../game/types'
import { clerkProfile, currentUserId } from './auth'
import { getStore } from './db/get-store'
import { DuplicateScoreError, type LeaderboardEntry } from './db/store'
import {
  GameTokenError,
  readGameToken,
  signGameToken,
  withExtraHint,
} from './game-token'
import { computeScore } from './score'
import { hintForRun, InvalidRunError, parsePresses, replayRun } from './verify'

export const LEADERBOARD_PAGE_SIZE = 25

export interface IssuedGame {
  token: string
  seed: number
  size: Size
  /** Null until the player makes the first move. */
  startedAt: number | null
  hints: number
}

export type StartResult =
  | { ok: true; token: string; startedAt: number }
  | { ok: false; error: 'expired' | 'invalid' }

export type HintResult =
  | { ok: true; index: number | null; token: string; hints: number }
  | { ok: false; error: 'expired' | 'invalid' | 'unavailable' }

export type SubmitResult =
  | {
      ok: true
      score: number
      moves: number
      hints: number
      elapsedMs: number
      place: number | null
      total: number
    }
  | {
      ok: false
      error:
        | 'unauthenticated'
        | 'expired'
        | 'invalid'
        | 'duplicate'
        | 'unavailable'
    }

export type LeaderboardResult =
  | {
      ok: true
      rows: LeaderboardEntry[]
      total: number
      page: number
      pageSize: number
    }
  | { ok: false; error: 'unavailable' }

function isSize(value: unknown): value is Size {
  return value === 3 || value === 4 || value === 5
}

function parseSize(input: unknown, fallback?: Size): Size {
  const value = (input as { size?: unknown } | null)?.size
  if (value === undefined && fallback) return fallback
  if (!isSize(value)) throw new Error('Invalid board size')
  return value
}

function parseTokenInput(input: unknown): { token: string; presses: unknown } {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid request')
  }
  const { token, presses } = input as { token?: unknown; presses?: unknown }
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    throw new Error('Invalid game token')
  }
  if (!Array.isArray(presses) || presses.length > 1000) {
    throw new Error('Invalid presses')
  }
  return { token, presses }
}

function parseStartInput(input: unknown): { token: string } {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid request')
  }
  const { token } = input as { token?: unknown }
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    throw new Error('Invalid game token')
  }
  return { token }
}

function tokenFailure(error: unknown): 'expired' | 'invalid' {
  return error instanceof GameTokenError && error.code === 'expired'
    ? 'expired'
    : 'invalid'
}

/** Public and stateless: no database write when a puzzle starts. */
export const issueGame = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ size: parseSize(input, 4) }))
  .handler(async ({ data }): Promise<IssuedGame> => {
    const issuedAt = Date.now()
    const token = signGameToken({
      size: data.size,
      seed: randomInt(0, 0x100000000),
      issuedAt,
      hints: 0,
      jti: randomUUID(),
    })

    const payload = readGameToken(token)
    return {
      token,
      seed: payload.seed,
      size: payload.size,
      startedAt: payload.startedAt ?? null,
      hints: payload.hints,
    }
  })

/**
 * Called (fire-and-forget) on the first move. Re-signs the token with the
 * server's start timestamp so idle time before the first press is not
 * charged. Idempotent: a started run returns its existing token.
 */
export const startRun = createServerFn({ method: 'POST' })
  .validator(parseStartInput)
  .handler(async ({ data }): Promise<StartResult> => {
    let pickup
    try {
      pickup = readGameToken(data.token)
    } catch (error) {
      return { ok: false, error: tokenFailure(error) }
    }

    if (pickup.startedAt != null) {
      return { ok: true, token: data.token, startedAt: pickup.startedAt }
    }

    const startedAt = Date.now()
    return {
      ok: true,
      token: signGameToken({ ...pickup, startedAt }),
      startedAt,
    }
  })

export const requestHint = createServerFn({ method: 'POST' })
  .validator(parseTokenInput)
  .handler(async ({ data }): Promise<HintResult> => {
    let pickup
    try {
      pickup = readGameToken(data.token)
    } catch (error) {
      return { ok: false, error: tokenFailure(error) }
    }

    try {
      const presses = parsePresses(data.presses, pickup.size)
      const hint = hintForRun(pickup.size, pickup.seed, presses)

      if (hint.index == null) {
        return {
          ok: true,
          index: null,
          token: data.token,
          hints: pickup.hints,
        }
      }

      const next = withExtraHint(pickup)
      return {
        ok: true,
        index: hint.index,
        token: next.token,
        hints: next.payload.hints,
      }
    } catch (error) {
      if (error instanceof InvalidRunError) {
        return { ok: false, error: 'invalid' }
      }
      return { ok: false, error: 'unavailable' }
    }
  })

export const submitScore = createServerFn({ method: 'POST' })
  .validator(parseTokenInput)
  .handler(async ({ data }): Promise<SubmitResult> => {
    let pickup
    try {
      pickup = readGameToken(data.token)
    } catch (error) {
      return { ok: false, error: tokenFailure(error) }
    }

    let presses: number[]
    try {
      presses = parsePresses(data.presses, pickup.size)
    } catch (error) {
      if (error instanceof InvalidRunError) {
        return { ok: false, error: 'invalid' }
      }
      return { ok: false, error: 'invalid' }
    }

    const replay = replayRun(pickup.size, pickup.seed, presses)
    if (!replay.solved || replay.solvedEarly) {
      return { ok: false, error: 'invalid' }
    }

    const userId = await currentUserId()
    if (!userId) {
      return { ok: false, error: 'unauthenticated' }
    }

    const elapsedMs = Math.max(
      0,
      Date.now() - (pickup.startedAt ?? pickup.issuedAt),
    )
    const moves = presses.length
    const score = computeScore({ moves, hints: pickup.hints, elapsedMs })
    const profile = await clerkProfile(userId)

    try {
      const store = await getStore()
      await store.upsertUser(profile)
      await store.insertScore({
        id: randomUUID(),
        userId,
        size: pickup.size,
        moves,
        hints: pickup.hints,
        elapsedMs,
        score,
        jti: pickup.jti,
        createdAtMs: Date.now(),
      })

      const [place, total] = await Promise.all([
        store.getPlayerPlace(pickup.size, userId),
        store.countPlayers(pickup.size),
      ])

      return {
        ok: true,
        score,
        moves,
        hints: pickup.hints,
        elapsedMs,
        place,
        total,
      }
    } catch (error) {
      if (error instanceof DuplicateScoreError) {
        return { ok: false, error: 'duplicate' }
      }
      return { ok: false, error: 'unavailable' }
    }
  })

export const fetchLeaderboard = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const page = (input as { page?: unknown } | null)?.page
    if (!Number.isInteger(page) || (page as number) < 0 || (page as number) > 10_000) {
      throw new Error('Invalid page')
    }
    return { size: parseSize(input), page: page as number }
  })
  .handler(async ({ data }): Promise<LeaderboardResult> => {
    try {
      const store = await getStore()
      const [rows, total] = await Promise.all([
        store.getLeaderboard(
          data.size,
          LEADERBOARD_PAGE_SIZE,
          data.page * LEADERBOARD_PAGE_SIZE,
        ),
        store.countPlayers(data.size),
      ])

      return {
        ok: true,
        rows,
        total,
        page: data.page,
        pageSize: LEADERBOARD_PAGE_SIZE,
      }
    } catch {
      return { ok: false, error: 'unavailable' }
    }
  })
