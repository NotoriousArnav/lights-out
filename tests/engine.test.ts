import { describe, expect, it } from 'vitest'

import {
  countLit,
  flip,
  hintTile,
  isSolved,
  neighbors,
  press,
  toggleEntry,
} from '../src/game/engine'
import { mulberry32 } from '../src/game/rng'
import { createPuzzle } from '../src/game/scramble'
import type { Puzzle } from '../src/game/types'

const SEEDS = Array.from({ length: 120 }, (_, i) => (i + 1) * 2654435761)

describe('neighbors', () => {
  it('covers the tile plus in-bounds orthogonal neighbours', () => {
    expect(neighbors(4, 0).sort()).toEqual([0, 1, 4].sort())
    expect(neighbors(4, 3).sort()).toEqual([2, 3, 7].sort())
    expect(neighbors(4, 1).sort()).toEqual([0, 1, 2, 5].sort())
    expect(neighbors(4, 5).sort()).toEqual([1, 4, 5, 6, 9].sort())
    expect(neighbors(4, 15).sort()).toEqual([11, 14, 15].sort())
  })

  it('never leaves the board', () => {
    for (const size of [3, 4, 5]) {
      for (let i = 0; i < size * size; i += 1) {
        for (const cell of neighbors(size, i)) {
          expect(cell).toBeGreaterThanOrEqual(0)
          expect(cell).toBeLessThan(size * size)
        }
        expect(neighbors(size, i)).toContain(i)
      }
    }
  })
})

describe('flip', () => {
  it('is its own inverse', () => {
    for (const size of [3, 4, 5]) {
      const puzzle = createPuzzle(size, mulberry32(7 + size))
      for (let index = 0; index < size * size; index += 1) {
        const once = press(puzzle, index)
        const twice = press(once, index)
        expect(twice.grid).toEqual(puzzle.grid)
        // Membership is restored, but order is not: a tile that is removed and
        // re-added moves to the end, exactly like the original Set.
        expect(new Set(twice.solution)).toEqual(new Set(puzzle.solution))
      }
    }
  })

  it('toggles the same set the original did', () => {
    const grid = [false, false, false, false]
    const { grid: next } = flip(grid, new Set(), 2, 0)
    expect(next).toEqual([true, true, true, false])
  })
})

describe('solution record', () => {
  it('appends on add and moves to the end after remove + add', () => {
    let solution = new Set<number>()
    solution = toggleEntry(solution, 1)
    solution = toggleEntry(solution, 2)
    solution = toggleEntry(solution, 1)
    expect([...solution]).toEqual([2])
    solution = toggleEntry(solution, 1)
    expect([...solution]).toEqual([2, 1])
    expect(hintTile(solution)).toBe(2)
    expect(hintTile(new Set())).toBeNull()
  })
})

describe('createPuzzle', () => {
  it('is deterministic for a given seed', () => {
    for (const size of [3, 4, 5]) {
      for (const seed of SEEDS.slice(0, 10)) {
        const a = createPuzzle(size, mulberry32(seed))
        const b = createPuzzle(size, mulberry32(seed))
        expect(a.grid).toEqual(b.grid)
        expect([...a.solution]).toEqual([...b.solution])
      }
    }
  })

  it('never starts solved', () => {
    for (const size of [3, 4, 5]) {
      for (const seed of SEEDS) {
        expect(countLit(createPuzzle(size, mulberry32(seed)).grid)).toBeGreaterThan(0)
      }
    }
  })

  it('is always solvable by pressing the recorded solution', () => {
    for (const size of [3, 4, 5]) {
      for (const seed of SEEDS) {
        let puzzle: Puzzle = createPuzzle(size, mulberry32(seed))
        expect(puzzle.solution.size).toBeGreaterThan(0)
        for (const index of [...puzzle.solution]) {
          puzzle = press(puzzle, index)
        }
        expect(isSolved(puzzle.grid)).toBe(true)
      }
    }
  })
})
