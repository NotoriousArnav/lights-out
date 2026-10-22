# Lights Out

The classic Lights Out puzzle, ported from a single HTML file to React 19 +
TanStack Start, with the original game's behavior preserved press for press.

Tap a tile to flip it and its neighbours. Turn every light off. Fewer moves is
a better score.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine unit tests + parity suite against the original HTML
npm run build    # production build
npm run typecheck
```

## What is ported

The original was one 115-line file with all state in a closure. The port keeps
the same rules and splits them into a pure engine plus a React view:

| Original | Port |
| --- | --- |
| `flip(i)` | `src/game/engine.ts` — immutable, returns new grid + solution set |
| `newGame()` scramble | `src/game/scramble.ts` — same `n²×2` presses, same retry |
| `sol` Set | `Puzzle.solution` — same insertion order, same `delete`/`add` semantics |
| Hint | `hintTile()` — first element of the remaining solution, 1800 ms outline |
| `bests` in `localStorage['lo-best']` | `src/hooks/useGame.ts` — same key, same format |
| DOM built by hand | `src/components/*` — same markup, classes and CSS |

### Deliberately preserved quirks

- The solution set is a valid solution, not necessarily an optimal one, so
  "Best" is not the mathematical minimum.
- Pressing a hinted tile does not clear the hint outline; it expires on its own.
- Clicking the already-selected size still generates a new puzzle.
- After a win, tiles stay clickable but presses are ignored.
- Every press counts as a move, including redundant ones.

### Small polish, no layout change

- Safe-area padding moved from `:root` to `body`, which is where it has an
  effect.
- The message is a `role="status"` live region.
- Tiles expose their lit/dark state in `aria-label`, and a `focus-visible` ring
  supports keyboard play.
- `prefers-reduced-motion` drops the press transform and glow transitions.
- `touch-action: manipulation` on tiles avoids double-tap zoom.

## Parity tests

`tests/parity.test.ts` loads `legacy/Lights Out.html` in jsdom, replaces
`Math.random` with a seeded generator, and clicks the real buttons. The ported
engine is driven with the same seed, and after **every press** the test compares:

- the full board,
- the move counter,
- the hint tile (which proves the solution `Set` ordering matches),
- the final message.

Run it with `npm test`.

## Project layout

```
src/
  routes/index.tsx      game page; the loader supplies the puzzle seed
  routes/__root.tsx     document shell and metadata
  components/           Board, Tile, SizePicker, StatBar, Controls, Message
  game/                 engine, scramble, RNG, types (no DOM, no React)
  hooks/useGame.ts      game state, scoring, hint timer, localStorage bests
  styles.css            the original stylesheet, ported
tests/                  engine and parity suites
legacy/                 the original HTML and design notes, untouched
```

## Roadmap

The next stage adds a Postgres leaderboard behind Clerk sign-in (Google,
GitHub, Discord, and Spotify behind a flag), with server-issued, signed puzzle
tokens and server-verified scores. Until then the game is fully playable
offline and bests live in `localStorage`, exactly like the original.
