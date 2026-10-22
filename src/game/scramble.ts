import { flip, isSolved } from './engine'
import type { Grid, Puzzle, RandomSource } from './types'

/**
 * Build a solvable puzzle exactly the way the original did: start from an
 * all-dark board and press `size² × 2` random tiles, retrying if the result is
 * still dark. Replaying the presses in reverse (or, since a press is its own
 * inverse, in any order) always clears the board.
 *
 * The random source is injectable so tests can drive both implementations with
 * the same sequence.
 */
export function createPuzzle(
  size: number,
  random: RandomSource = Math.random,
): Puzzle {
  const cells = size * size
  let grid: Grid
  let solution: Set<number>

  do {
    grid = Array.from({ length: cells }, () => false)
    solution = new Set<number>()
    for (let k = 0; k < cells * 2; k += 1) {
      const index = Math.floor(random() * cells)
      const next = flip(grid, solution, size, index)
      grid = next.grid
      solution = next.solution
    }
  } while (isSolved(grid))

  return { size, grid, solution }
}
