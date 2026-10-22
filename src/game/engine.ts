import type { Grid, Puzzle } from './types'

/**
 * Tiles affected by pressing `index`: the tile itself, then down, up, right,
 * left. The order matches the original game so that any future animation or
 * set-ordering quirk stays reproducible.
 */
export function neighbors(size: number, index: number): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const result: number[] = []

  for (const [dr, dc] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < size && c >= 0 && c < size) {
      result.push(r * size + c)
    }
  }

  return result
}

/**
 * Mirrors the original `sol` mutation: pressing a tile that is in the set
 * removes it, otherwise it is appended. Appending after a removal moves the
 * tile to the end, which is what makes the original hint order observable.
 */
export function toggleEntry(
  solution: ReadonlySet<number>,
  index: number,
): Set<number> {
  const next = new Set(solution)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  return next
}

/**
 * Press a tile: flip it and its neighbours, and toggle its entry in the
 * solution record. Pure — returns new objects and never mutates the puzzle.
 */
export function flip(
  grid: Grid,
  solution: ReadonlySet<number>,
  size: number,
  index: number,
): { grid: Grid; solution: Set<number> } {
  const nextGrid = [...grid]
  for (const cell of neighbors(size, index)) {
    nextGrid[cell] = !nextGrid[cell]
  }
  return { grid: nextGrid, solution: toggleEntry(solution, index) }
}

export function press(puzzle: Puzzle, index: number): Puzzle {
  const { grid, solution } = flip(
    puzzle.grid,
    puzzle.solution,
    puzzle.size,
    index,
  )
  return { size: puzzle.size, grid, solution }
}

export function isSolved(grid: Grid): boolean {
  return !grid.some(Boolean)
}

/** The tile the Hint button highlights, or `null` when no presses remain. */
export function hintTile(solution: ReadonlySet<number>): number | null {
  for (const index of solution) return index
  return null
}

export function countLit(grid: Grid): number {
  let lit = 0
  for (const on of grid) if (on) lit += 1
  return lit
}
