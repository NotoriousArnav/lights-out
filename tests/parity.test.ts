import { readFileSync } from 'node:fs'

import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { hintTile, isSolved, press } from '../src/game/engine'
import { mulberry32 } from '../src/game/rng'
import { createPuzzle } from '../src/game/scramble'
import type { Puzzle } from '../src/game/types'

const ORIGINAL_HTML = readFileSync(
  new URL('../legacy/Lights Out.html', import.meta.url),
  'utf8',
)

const SIZES = [3, 4, 5] as const
const SEEDS_PER_SIZE = 15

interface Snapshot {
  grid: boolean[]
  moves: number
  message: string
}

function boot(size: number, random: () => number): JSDOM {
  const dom = new JSDOM(ORIGINAL_HTML, {
    runScripts: 'outside-only',
    url: 'https://lights-out.test/',
  })

  // Hand the script a deterministic RNG inside its own realm.
  ;(dom.window as unknown as { __rng: () => number }).__rng = random
  dom.window.eval('Math.random = () => window.__rng()')

  const script = dom.window.document.querySelector('script')?.textContent ?? ''
  dom.window.eval(script)

  // The original always boots at 4×4, then the size button starts a new game.
  clickSize(dom, size)
  return dom
}

function clickSize(dom: JSDOM, size: number): void {
  const buttons = [...dom.window.document.querySelectorAll('#sizes button')]
  const target = buttons.find(
    (button) => button.textContent === `${size}×${size}`,
  ) as HTMLElement | undefined
  if (!target) throw new Error(`size button ${size} not found`)
  target.click()
}

function cells(dom: JSDOM): HTMLElement[] {
  return [...dom.window.document.querySelectorAll('#board .cell')] as HTMLElement[]
}

function snapshot(dom: JSDOM): Snapshot {
  const document = dom.window.document
  return {
    grid: cells(dom).map((cell) => cell.classList.contains('on')),
    moves: Number(document.getElementById('moves')?.textContent ?? '0'),
    message: document.getElementById('msg')?.textContent ?? '',
  }
}

function originalHint(dom: JSDOM): number | null {
  ;(dom.window.document.getElementById('hint') as HTMLElement).click()
  const index = cells(dom).findIndex((cell) => cell.classList.contains('hint'))
  return index === -1 ? null : index
}

/**
 * The strongest guarantee in this repo: drive the shipped HTML file with a
 * seeded Math.random, replay the exact same presses through the ported engine,
 * and compare the board, move counter, hint tile and final message after every
 * single press.
 */
describe('parity with the original game', () => {
  for (const size of SIZES) {
    it(`matches the original ${size}×${size} board press for press`, () => {
      for (let seedIndex = 0; seedIndex < SEEDS_PER_SIZE; seedIndex += 1) {
        const seed = (seedIndex + 1) * 2654435761 + size * 7919
        const dom = boot(size, mulberry32(seed))

        // Mirror the consumption order: one 4×4 boot puzzle, then the chosen
        // size, from the same seed.
        const engineRandom = mulberry32(seed)
        createPuzzle(4, engineRandom)
        let puzzle: Puzzle = createPuzzle(size, engineRandom)

        expect(snapshot(dom).grid).toEqual([...puzzle.grid])

        const picks = mulberry32(seed ^ 0x9e3779b9)
        let presses = 0

        for (let step = 0; step < 80; step += 1) {
          if (isSolved(puzzle.grid)) break

          const index = Math.floor(picks() * size * size)
          cells(dom)[index]!.click()
          puzzle = press(puzzle, index)
          presses += 1

          const after = snapshot(dom)
          expect(after.grid).toEqual([...puzzle.grid])
          expect(after.moves).toBe(presses)

          const expectedHint = hintTile(puzzle.solution)
          if (expectedHint !== null) {
            expect(originalHint(dom)).toBe(expectedHint)
          } else {
            // The original returns early when nothing remains to press and
            // leaves the previous outline in place, so no new hint appears.
            expect(isSolved(puzzle.grid)).toBe(true)
          }
        }

        if (isSolved(puzzle.grid)) {
          expect(snapshot(dom).message).toBe(
            `Solved in ${presses} moves – a new best!`,
          )
        }

        dom.window.close()
      }
    })
  }
})
