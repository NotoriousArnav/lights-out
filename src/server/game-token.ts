import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import type { Size } from '../game/types'
import { SIZES } from '../game/types'

const VERSION = 'v1'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const CLOCK_SKEW_MS = 60_000

export interface GameTokenPayload {
  /** Board size. */
  size: Size
  /** Seed passed to mulberry32. */
  seed: number
  /** Server timestamp (ms) when the puzzle was issued. */
  issuedAt: number
  /** Server timestamp (ms) of the first move, once the run has started. */
  startedAt?: number
  /** Number of hints served for this run. */
  hints: number
  /** Unique id, used to reject the same run twice. */
  jti: string
}

export type TokenErrorCode =
  | 'malformed'
  | 'version'
  | 'signature'
  | 'expired'
  | 'invalid-payload'

export class GameTokenError extends Error {
  readonly code: TokenErrorCode

  constructor(code: TokenErrorCode, message: string) {
    super(message)
    this.name = 'GameTokenError'
    this.code = code
  }
}

let devSecret: string | null = null

/**
 * `PUZZLE_SECRET` in production. Development falls back to a per-process
 * secret so a fresh clone runs without setup; set the variable to keep runs
 * valid across server restarts.
 */
function getSecret(): string {
  const configured = process.env.PUZZLE_SECRET?.trim()
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    throw new Error('PUZZLE_SECRET must be set in production')
  }

  devSecret ??= randomBytes(32).toString('hex')
  return devSecret
}

function sign(payloadPart: string, secret: string): string {
  return createHmac('sha256', secret).update(`${VERSION}.${payloadPart}`).digest('base64url')
}

function isSize(value: unknown): value is Size {
  return (SIZES as readonly number[]).includes(value as number)
}

function isPayload(value: unknown): value is GameTokenPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    isSize(payload.size) &&
    typeof payload.seed === 'number' &&
    Number.isInteger(payload.seed) &&
    payload.seed >= 0 &&
    payload.seed <= 0xffffffff &&
    typeof payload.issuedAt === 'number' &&
    Number.isFinite(payload.issuedAt) &&
    (payload.startedAt === undefined ||
      (typeof payload.startedAt === 'number' &&
        Number.isFinite(payload.startedAt) &&
        payload.startedAt >= payload.issuedAt)) &&
    typeof payload.hints === 'number' &&
    Number.isInteger(payload.hints) &&
    payload.hints >= 0 &&
    typeof payload.jti === 'string' &&
    payload.jti.length > 0 &&
    payload.jti.length <= 64
  )
}

export function signGameToken(payload: GameTokenPayload): string {
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${VERSION}.${payloadPart}.${sign(payloadPart, getSecret())}`
}

export interface ReadTokenOptions {
  secret?: string
  now?: number
}

export function readGameToken(
  token: string,
  options: ReadTokenOptions = {},
): GameTokenPayload {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new GameTokenError('malformed', 'Malformed game token')
  }

  const [version, payloadPart, signature] = parts as [string, string, string]
  if (version !== VERSION) {
    throw new GameTokenError('version', 'Unsupported game token version')
  }

  const expected = Buffer.from(sign(payloadPart, options.secret ?? getSecret()), 'base64url')
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new GameTokenError('signature', 'Invalid game token signature')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
  } catch {
    throw new GameTokenError('malformed', 'Malformed game token payload')
  }

  if (!isPayload(parsed)) {
    throw new GameTokenError('invalid-payload', 'Invalid game token payload')
  }

  const now = options.now ?? Date.now()
  if (parsed.issuedAt > now + CLOCK_SKEW_MS) {
    throw new GameTokenError('invalid-payload', 'Game token is from the future')
  }
  if (now - parsed.issuedAt > TOKEN_TTL_MS) {
    throw new GameTokenError('expired', 'Game token has expired')
  }

  return parsed
}

/** Returns a token for the same run with one more hint charged to it. */
export function withExtraHint(payload: GameTokenPayload): {
  token: string
  payload: GameTokenPayload
} {
  const next: GameTokenPayload = { ...payload, hints: payload.hints + 1 }
  return { token: signGameToken(next), payload: next }
}
