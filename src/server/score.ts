export interface ScoreInput {
  moves: number
  hints: number
  elapsedMs: number
}

/**
 * Higher is better.
 *
 *   10,000 base
 *   −50 per move
 *   −200 per hint   (a hint costs four moves)
 *   −5 per second   (a move per ten seconds)
 *
 * Per-size leaderboards mean 3×3 and 5×5 never compete on the same table.
 */
export function computeScore({ moves, hints, elapsedMs }: ScoreInput): number {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000))
  return Math.max(
    0,
    10_000 - 50 * Math.max(0, moves) - 200 * Math.max(0, hints) - 5 * seconds,
  )
}
