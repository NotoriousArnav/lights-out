import { describe, expect, it } from 'vitest'

import { computeScore } from '../src/server/score'

describe('computeScore', () => {
  it('starts at 10,000 for an instant, hint-free solve', () => {
    expect(computeScore({ moves: 0, hints: 0, elapsedMs: 0 })).toBe(10_000)
  })

  it('charges 50 per move, 200 per hint, and 5 per whole second', () => {
    expect(computeScore({ moves: 10, hints: 0, elapsedMs: 0 })).toBe(9_500)
    expect(computeScore({ moves: 0, hints: 2, elapsedMs: 0 })).toBe(9_600)
    expect(computeScore({ moves: 0, hints: 0, elapsedMs: 65_000 })).toBe(9_675)
    expect(
      computeScore({ moves: 12, hints: 1, elapsedMs: 42_500 }),
    ).toBe(10_000 - 600 - 200 - 210)
  })

  it('rounds time down to whole seconds', () => {
    expect(computeScore({ moves: 0, hints: 0, elapsedMs: 999 })).toBe(10_000)
    expect(computeScore({ moves: 0, hints: 0, elapsedMs: 1_999 })).toBe(9_995)
  })

  it('never goes below zero', () => {
    expect(computeScore({ moves: 1_000, hints: 100, elapsedMs: 3_600_000 })).toBe(0)
  })

  it('treats negative inputs as zero', () => {
    expect(computeScore({ moves: -5, hints: -1, elapsedMs: -100 })).toBe(10_000)
  })
})
