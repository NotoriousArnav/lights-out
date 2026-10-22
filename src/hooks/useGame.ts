import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'

import { isSolved, press } from '../game/engine'
import { mulberry32 } from '../game/rng'
import { createPuzzle } from '../game/scramble'
import type { Puzzle, Size } from '../game/types'
import { SIZES } from '../game/types'
import {
  issueGame,
  requestHint,
  startRun,
  submitScore,
} from '../server/game-fns'
import type { IssuedGame } from '../server/game-fns'

export { SIZES }
export type { Size }

export type Bests = Partial<Record<Size, number>>

export type SaveState =
  | { status: 'idle' }
  | { status: 'guest' }
  | { status: 'saving' }
  | { status: 'saved'; score: number; place: number | null; total: number }
  | { status: 'error'; reason: 'expired' | 'invalid' | 'duplicate' | 'unavailable' | 'unauthenticated' }

const BEST_KEY = 'lo-best'
const HINT_MS = 1800

export interface Hint {
  readonly index: number
  readonly nonce: number
}

interface State {
  size: Size
  seed: number
  token: string
  /** Null until the first move; the clock does not run before then. */
  startedAt: number | null
  puzzle: Puzzle
  moves: number
  presses: number[]
  hints: number
  done: boolean
  hint: Hint | null
  bests: Bests
  message: string
  finalElapsedMs: number | null
  save: SaveState
}

export interface Game extends Omit<State, 'puzzle'> {
  puzzle: Puzzle
  elapsedMs: number
  starting: boolean
  hinting: boolean
  press: (index: number) => void
  showHint: () => void
  newGame: (size?: Size) => Promise<void>
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

function initialState(initial: IssuedGame, signedIn: boolean): State {
  return {
    size: initial.size,
    seed: initial.seed,
    token: initial.token,
    startedAt: initial.startedAt,
    puzzle: createPuzzle(initial.size, mulberry32(initial.seed)),
    moves: 0,
    presses: [],
    hints: initial.hints,
    done: false,
    hint: null,
    bests: {},
    message: '',
    finalElapsedMs: null,
    save: { status: signedIn ? 'idle' : 'guest' },
  }
}

/**
 * The whole game, ported from the original IIFE plus server-issued puzzles.
 * Moves are counted locally for display, but the server recounts them from
 * the presses array before a score is stored. The clock starts on the first
 * press: until then the puzzle is just sitting on screen.
 */
export function useGame(
  initial: IssuedGame,
  options: { signedIn: boolean; onScoreSaved?: () => void },
): Game {
  const { signedIn, onScoreSaved } = options
  const [state, setState] = useState<State>(() => initialState(initial, signedIn))
  const [now, setNow] = useState(0)
  const [starting, setStarting] = useState(false)
  const [hinting, setHinting] = useState(false)

  const hintNonce = useRef(0)
  const hintRequest = useRef(false)
  const submissionAttempted = useRef(false)
  const alive = useRef(true)

  // The signed token and start time are mirrored in refs because async
  // request chains must always build on the newest token, not the token that
  // was current when the request was queued.
  const tokenRef = useRef(initial.token)
  const startedAtRef = useRef<number | null>(initial.startedAt)
  const startPromiseRef = useRef<Promise<string> | null>(null)
  const tokenQueue = useRef<Promise<void>>(Promise.resolve())
  const generation = useRef(0)

  const issueGameFn = useServerFn(issueGame)
  const startRunFn = useServerFn(startRun)
  const requestHintFn = useServerFn(requestHint)
  const submitScoreFn = useServerFn(submitScore)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // Bests live in localStorage, so they are read after mount to keep the
  // server-rendered markup identical to the first client render.
  useEffect(() => {
    setState((current) => ({ ...current, bests: readBests() }))
  }, [])

  // Serialises token updates (start + hint) so neither response can clobber
  // the other's fields.
  const enqueueTokenUpdate = useCallback(
    <T>(task: () => Promise<T>): Promise<T> => {
      const result = tokenQueue.current.then(task, task)
      tokenQueue.current = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
    [],
  )

  const beginRun = useCallback((): Promise<string> => {
    if (startPromiseRef.current) return startPromiseRef.current

    const generationAtStart = generation.current
    const promise = enqueueTokenUpdate(async () => {
      if (startedAtRef.current != null) return tokenRef.current

      const result = await startRunFn({ data: { token: tokenRef.current } })
      if (!result.ok || generation.current !== generationAtStart) {
        return tokenRef.current
      }

      tokenRef.current = result.token
      startedAtRef.current = result.startedAt

      if (alive.current) {
        setState((current) => ({
          ...current,
          token: result.token,
          startedAt: result.startedAt,
        }))
      }

      return result.token
    })

    startPromiseRef.current = promise
    return promise
  }, [enqueueTokenUpdate, startRunFn])

  // Clock starts on the first move, stops on a win. The server timestamp
  // replaces the optimistic local one as soon as startRun answers.
  useEffect(() => {
    if (state.done || state.startedAt == null) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [state.done, state.startedAt, state.token])

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

  const handlePress = useCallback(
    (index: number) => {
      if (state.done || starting) return

      if (state.presses.length === 0 && state.startedAt == null) {
        const localStart = Date.now()
        setNow(localStart)
        setState((current) =>
          current.startedAt == null
            ? { ...current, startedAt: localStart }
            : current,
        )
        void beginRun()
      }

      setState((current) => {
        if (current.done) return current

        const puzzle = press(current.puzzle, index)
        const presses = [...current.presses, index]
        const moves = current.moves + 1

        if (!isSolved(puzzle.grid)) {
          return { ...current, puzzle, presses, moves }
        }

        const previous = current.bests[current.size]
        const isBest = previous == null || moves < previous
        const bests = isBest
          ? { ...current.bests, [current.size]: moves }
          : current.bests

        return {
          ...current,
          puzzle,
          presses,
          moves,
          done: true,
          bests,
          finalElapsedMs:
            current.startedAt == null
              ? 0
              : Math.max(0, Date.now() - current.startedAt),
          message: `Solved in ${moves} moves${isBest ? ' – a new best!' : '.'}`,
          save: signedIn ? { status: 'idle' } : { status: 'guest' },
        }
      })
    },
    [beginRun, signedIn, starting, state.done, state.presses.length, state.startedAt],
  )

  // Submit once per game. The start request may still be in flight when the
  // player wins on the first move, so wait for it before sending the token.
  useEffect(() => {
    if (!state.done || !signedIn) return
    if (submissionAttempted.current) return
    submissionAttempted.current = true

    const generationAtWin = generation.current
    const presses = state.presses

    setState((current) => ({ ...current, save: { status: 'saving' } }))

    void (async () => {
      try {
        if (startPromiseRef.current) await startPromiseRef.current
        if (!alive.current) return

        const token = tokenRef.current
        const result = await submitScoreFn({ data: { token, presses } })
        if (!alive.current) return

        if (result.ok) {
          // Refresh the board even if the player has already moved on.
          onScoreSaved?.()
        }

        if (generation.current !== generationAtWin) return

        if (!result.ok) {
          setState((current) => ({
            ...current,
            save: { status: 'error', reason: result.error },
          }))
          return
        }

        setState((current) => ({
          ...current,
          finalElapsedMs: result.elapsedMs,
          save: {
            status: 'saved',
            score: result.score,
            place: result.place,
            total: result.total,
          },
        }))
      } catch {
        if (!alive.current || generation.current !== generationAtWin) return
        setState((current) => ({
          ...current,
          save: { status: 'error', reason: 'unavailable' },
        }))
      }
    })()
  }, [state.done, state.presses, state.token, signedIn, submitScoreFn, onScoreSaved])

  const showHint = useCallback(() => {
    if (state.done || starting || hintRequest.current) return
    hintRequest.current = true
    setHinting(true)

    const presses = state.presses
    const pressCount = presses.length
    const generationAtHint = generation.current

    const task = enqueueTokenUpdate(async () => {
      const result = await requestHintFn({
        data: { token: tokenRef.current, presses },
      })
      if (!alive.current || generation.current !== generationAtHint) return

      if (!result.ok) {
        setState((current) => ({
          ...current,
          message:
            result.error === 'expired'
              ? 'This puzzle has expired. Start a new one.'
              : 'Hint unavailable.',
        }))
        return
      }

      tokenRef.current = result.token
      setState((current) => ({
        ...current,
        token: result.token,
        hints: result.hints,
        hint:
          result.index != null && current.presses.length === pressCount
            ? { index: result.index, nonce: ++hintNonce.current }
            : current.hint,
      }))
    })

    void task
      .catch(() => {
        if (alive.current) {
          setState((current) => ({ ...current, message: 'Hint unavailable.' }))
        }
      })
      .finally(() => {
        hintRequest.current = false
        if (alive.current) setHinting(false)
      })
  }, [enqueueTokenUpdate, requestHintFn, starting, state.done, state.presses])

  const newGame = useCallback(
    async (size?: Size) => {
      if (starting) return
      const nextSize = size ?? state.size
      generation.current += 1
      setStarting(true)

      try {
        const issued = await issueGameFn({ data: { size: nextSize } })
        if (!alive.current) return

        tokenRef.current = issued.token
        startedAtRef.current = null
        startPromiseRef.current = null
        submissionAttempted.current = false
        hintNonce.current = 0
        setNow(0)

        setState((current) => ({
          ...current,
          size: issued.size,
          seed: issued.seed,
          token: issued.token,
          startedAt: issued.startedAt,
          puzzle: createPuzzle(issued.size, mulberry32(issued.seed)),
          moves: 0,
          presses: [],
          hints: issued.hints,
          done: false,
          hint: null,
          message: '',
          finalElapsedMs: null,
          save: { status: signedIn ? 'idle' : 'guest' },
        }))
      } catch {
        if (!alive.current) return
        setState((current) => ({
          ...current,
          message: 'Could not start a new puzzle. Try again.',
        }))
      } finally {
        if (alive.current) setStarting(false)
      }
    },
    [issueGameFn, signedIn, starting, state.size],
  )

  const elapsedMs =
    state.startedAt == null
      ? 0
      : (state.finalElapsedMs ?? Math.max(0, now - state.startedAt))

  return {
    ...state,
    elapsedMs,
    starting,
    hinting,
    press: handlePress,
    showHint,
    newGame,
  }
}
