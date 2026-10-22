import { describe, expect, it } from 'vitest'

import { mulberry32 } from '../src/game/rng'
import { createPuzzle } from '../src/game/scramble'
import {
  hintForRun,
  InvalidRunError,
  parsePresses,
  replayRun,
} from '../src/server/verify'

const CASES = [
  { size: 3 as const, seed: 11 },
  { size: 4 as const, seed: 22 },
  { size: 5 as const, seed: 33 },
]

describe('parsePresses', () => {
  it('accepts in-bounds cell indexes', () => {
    expect(parsePresses([0, 3, 8], 3)).toEqual([0, 3, 8])
    expect(parsePresses([], 5)).toEqual([])
  })

  it('rejects non-arrays, out-of-bounds indexes and fractions', () => {
    expect(() => parsePresses('0', 4)).toThrow(InvalidRunError)
    expect(() => parsePresses([16], 4)).toThrow(InvalidRunError)
    expect(() => parsePresses([-1], 4)).toThrow(InvalidRunError)
    expect(() => parsePresses([1.5], 4)).toThrow(InvalidRunError)
    expect(() => parsePresses(Array.from({ length: 1001 }, () => 0), 4)).toThrow(
      InvalidRunError,
    )
  })
})

describe('replayRun', () => {
  it('solves when the recorded solution is pressed', () => {
    for (const { size, seed } of CASES) {
      const solution = [...createPuzzle(size, mulberry32(seed)).solution]
      const replay = replayRun(size, seed, solution)
      expect(replay.solved).toBe(true)
      expect(replay.solvedEarly).toBe(false)
    }
  })

  it('does not accept an unsolved run', () => {
    for (const { size, seed } of CASES) {
      const replay = replayRun(size, seed, [])
      expect(replay.solved).toBe(false)
      expect(replay.solvedEarly).toBe(false)
    }
  })

  it('flags presses made after the board is already dark', () => {
    for (const { size, seed } of CASES) {
      const solution = [...createPuzzle(size, mulberry32(seed)).solution]
      const replay = replayRun(size, seed, [...solution, 0])
      expect(replay.solved).toBe(true)
      expect(replay.solvedEarly).toBe(true)
    }
  })
})

describe('hintForRun', () => {
  it('returns the first recorded solution tile for the current board', () => {
    for (const { size, seed } of CASES) {
      const puzzle = createPuzzle(size, mulberry32(seed))
      const hint = hintForRun(size, seed, [])
      expect(hint.solved).toBe(false)
      expect(hint.index).toBe([...puzzle.solution][0])
    }
  })

  it('has no hint once the board is dark', () => {
    for (const { size, seed } of CASES) {
      const solution = [...createPuzzle(size, mulberry32(seed)).solution]
      expect(hintForRun(size, seed, solution)).toEqual({ index: null, solved: true })
    }
  })
})
