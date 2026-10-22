import { hintTile, isSolved, press } from '../game/engine'
import { mulberry32 } from '../game/rng'
import { createPuzzle } from '../game/scramble'
import type { Puzzle, Size } from '../game/types'

const MAX_PRESSES = 1000

export class InvalidRunError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRunError'
  }
}

export function parsePresses(input: unknown, size: Size): number[] {
  if (!Array.isArray(input)) {
    throw new InvalidRunError('Presses must be an array')
  }
  if (input.length > MAX_PRESSES) {
    throw new InvalidRunError('Too many presses')
  }

  const cells = size * size
  return input.map((value) => {
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) >= cells) {
      throw new InvalidRunError('Press is outside the board')
    }
    return value as number
  })
}

export interface ReplayResult {
  puzzle: Puzzle
  /** The board is dark after the final press. */
  solved: boolean
  /** The board was already solved before the final press. */
  solvedEarly: boolean
}

/**
 * Replays a run from its seed. This is the server's source of truth: moves
 * come from the presses array, never from the client's counter.
 */
export function replayRun(
  size: Size,
  seed: number,
  presses: readonly number[],
): ReplayResult {
  let puzzle = createPuzzle(size, mulberry32(seed))

  for (const index of presses) {
    if (isSolved(puzzle.grid)) {
      return { puzzle, solved: true, solvedEarly: true }
    }
    puzzle = press(puzzle, index)
  }

  return { puzzle, solved: isSolved(puzzle.grid), solvedEarly: false }
}

export function hintForRun(
  size: Size,
  seed: number,
  presses: readonly number[],
): { index: number | null; solved: boolean } {
  const replay = replayRun(size, seed, presses)
  if (replay.solved) return { index: null, solved: true }
  return { index: hintTile(replay.puzzle.solution), solved: false }
}
