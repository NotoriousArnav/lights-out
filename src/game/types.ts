export type Grid = readonly boolean[]

export const SIZES = [3, 4, 5] as const

export type Size = (typeof SIZES)[number]

export type RandomSource = () => number

export interface Puzzle {
  /** Board width/height. */
  readonly size: number
  /** Row-major on/off state. `true` means lit. */
  readonly grid: Grid
  /**
   * Tiles that still need pressing, in the same insertion order the original
   * game used for its `Set`. The first element is what the Hint button reveals.
   */
  readonly solution: ReadonlySet<number>
}
