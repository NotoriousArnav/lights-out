import { beforeAll, describe, expect, it } from 'vitest'

import {
  GameTokenError,
  readGameToken,
  signGameToken,
  withExtraHint,
} from '../src/server/game-token'
import type { GameTokenPayload } from '../src/server/game-token'

const SECRET = 'unit-test-secret'

beforeAll(() => {
  process.env.PUZZLE_SECRET = SECRET
})

function payload(overrides: Partial<GameTokenPayload> = {}): GameTokenPayload {
  return {
    size: 4,
    seed: 123_456,
    issuedAt: 1_700_000_000_000,
    hints: 0,
    jti: 'run-1',
    ...overrides,
  }
}

function expectCode(run: () => unknown, code: GameTokenError['code']) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(GameTokenError)
    expect((error as GameTokenError).code).toBe(code)
    return
  }
  throw new Error('Expected the token to be rejected')
}

describe('game tokens', () => {
  it('round-trips a signed payload', () => {
    const token = signGameToken(payload())
    expect(readGameToken(token, { now: 1_700_000_000_000 })).toEqual(payload())
  })

  it('rejects a tampered payload', () => {
    const token = signGameToken(payload())
    const [version, body, signature] = token.split('.')
    const decoded = JSON.parse(Buffer.from(body!, 'base64url').toString('utf8'))
    decoded.hints = 0
    decoded.seed = 999
    const tampered = `${version}.${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${signature}`
    expectCode(() => readGameToken(tampered, { now: 1_700_000_000_000 }), 'signature')
  })

  it('rejects a token signed with another secret', () => {
    const token = signGameToken(payload())
    expectCode(
      () =>
        readGameToken(token, {
          now: 1_700_000_000_000,
          secret: 'other-secret',
        }),
      'signature',
    )
  })

  it('rejects malformed tokens and unknown versions', () => {
    expectCode(() => readGameToken('not-a-token'), 'malformed')
    expectCode(() => readGameToken('v2.abc.def'), 'version')
  })

  it('expires after 24 hours', () => {
    const token = signGameToken(payload())
    expect(() => readGameToken(token, { now: 1_700_000_000_000 + 24 * 60 * 60 * 1000 })).not.toThrow()
    expectCode(
      () => readGameToken(token, { now: 1_700_000_001_000 + 24 * 60 * 60 * 1000 }),
      'expired',
    )
  })

  it('rejects a token dated too far in the future', () => {
    const token = signGameToken(payload())
    expectCode(
      () => readGameToken(token, { now: 1_700_000_000_000 - 120_000 }),
      'invalid-payload',
    )
  })

  it('validates the payload shape', () => {
    const token = signGameToken({ ...payload(), size: 6 as GameTokenPayload['size'] })
    expectCode(() => readGameToken(token, { now: 1_700_000_000_000 }), 'invalid-payload')

    const badSeed = signGameToken({ ...payload(), seed: -1 })
    expectCode(() => readGameToken(badSeed, { now: 1_700_000_000_000 }), 'invalid-payload')
  })

  it('adds a hint without changing the rest of the run', () => {
    const original = payload({ hints: 1, startedAt: 1_700_000_005_000 })
    const next = withExtraHint(original)

    expect(next.payload).toEqual({ ...original, hints: 2 })
    expect(readGameToken(next.token, { now: 1_700_000_010_000 })).toEqual({
      ...original,
      hints: 2,
    })
  })

  it('accepts a start time but not one before issue', () => {
    const started = payload({ startedAt: 1_700_000_001_000 })
    expect(readGameToken(signGameToken(started), { now: 1_700_000_002_000 })).toEqual(started)

    const backwards = payload({ startedAt: 1_699_999_999_000 })
    expectCode(
      () => readGameToken(signGameToken(backwards), { now: 1_700_000_002_000 }),
      'invalid-payload',
    )
  })
})
