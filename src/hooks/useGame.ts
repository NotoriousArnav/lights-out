import { useCallback, useEffect, useRef, useState } from 'react'

import { hintTile, isSolved, press } from '../game/engine'
import { mulberry32 } from '../game/rng'
import { createPuzzle } from '../game/scramble'
import type { Puzzle } from '../game/types'

export const SIZES = [3, 4, 5] as const
export type Size = (typeof SIZES)[number]

export type Bests = Partial<Record<Size, number>>

const BEST_KEY = 'lo-best'
const HINT_MS = 1800

export interface Hint {
  readonly index: number
  readonly nonce: number
}

interface State {
  size: Size
  puzzle: Puzzle
  moves: number
  done: boolean
  hint: Hint | null
  bests: Bests
  message: string
}

export interface Game extends Omit<State, 'puzzle'> {
  puzzle: Puzzle
  press: (index: number) => void
  showHint: () => void
  newGame: (size?: Size) => void
}

function readBests(): Bests {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(BEST_KEY) || '{}')
    const bests: Bests = {}
    if (raw && typeof raw === 'object') {
      for (const size of SIZES) {
        const value = (raw as Record<string, unknown>)[String(size)]
        if (typeof value === 'number' && Number.isFinite(value)) {
          bests[size] = value
        }
      }
    }
    return bests
  } catch {
    return {}
  }
}

function writeBests(bests: Bests): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(bests))
  } catch {
    // Private mode or a full quota: the game stays playable, records just
    // do not survive the session.
  }
}

function initialState(seed: number): State {
  return {
    size: 4,
    puzzle: createPuzzle(4, mulberry32(seed)),
    moves: 0,
    done: false,
    hint: null,
    bests: {},
    message: '',
  }
}

/**
 * The whole game, ported from the original IIFE. Every rule lives here; the
 * components only render it.
 */
export function useGame(seed: number): Game {
  const [state, setState] = useState<State>(() => initialState(seed))
  const gameCount = useRef(0)
  const hintNonce = useRef(0)

  // Bests live in localStorage, so they are read after mount to keep the
  // server-rendered markup identical to the first client render.
  useEffect(() => {
    setState((current) => ({ ...current, bests: readBests() }))
  }, [])

  const hint = state.hint
  useEffect(() => {
    if (!hint) return
    const timer = setTimeout(() => {
      setState((current) =>
        current.hint?.nonce === hint.nonce ? { ...current, hint: null } : current,
      )
    }, HINT_MS)
    return () => clearTimeout(timer)
  }, [hint])

  useEffect(() => {
    if (state.done) writeBests(state.bests)
  }, [state.done, state.bests])

  const handlePress = useCallback((index: number) => {
    setState((current) => {
      if (current.done) return current

      const puzzle = press(current.puzzle, index)
      const moves = current.moves + 1

      if (!isSolved(puzzle.grid)) {
        return { ...current, puzzle, moves }
      }

      const previous = current.bests[current.size]
      const isBest = previous == null || moves < previous
      const bests = isBest
        ? { ...current.bests, [current.size]: moves }
        : current.bests

      return {
        ...current,
        puzzle,
        moves,
        done: true,
        bests,
        message: `Solved in ${moves} moves${isBest ? ' – a new best!' : '.'}`,
      }
    })
  }, [])

  const showHint = useCallback(() => {
    setState((current) => {
      if (current.done) return current
      const index = hintTile(current.puzzle.solution)
      if (index == null) return current
      hintNonce.current += 1
      return { ...current, hint: { index, nonce: hintNonce.current } }
    })
  }, [])

  const newGame = useCallback(
    (size?: Size) => {
      const nextSize = size ?? state.size
      gameCount.current += 1
      const puzzle = createPuzzle(nextSize, mulberry32(seed + gameCount.current))
      setState((current) => ({
        ...current,
        size: nextSize,
        puzzle,
        moves: 0,
        done: false,
        hint: null,
        message: '',
      }))
    },
    [seed, state.size],
  )

  return {
    ...state,
    press: handlePress,
    showHint,
    newGame,
  }
}
