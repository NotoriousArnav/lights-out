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

## Accounts

Sign-in is powered by [Clerk](https://clerk.com). Copy `.env.example` to
`.env.local` and fill in the keys from your Clerk application. Without a
publishable key the app still runs, as a guest-only game — useful for fresh
clones and CI.

```bash
cp .env.example .env.local
```

The app is wired for Google, GitHub, Discord, and Spotify. Clerk's development
instance supplies shared OAuth credentials for Google, GitHub, and Discord, so
those work without setting anything up. **Spotify requires your own OAuth
client** (Client ID and Secret from the Spotify developer dashboard), added in
Clerk under *SSO connections → Spotify*; it then appears on the sign-in screen
automatically. Enabling it in code is deliberately not a separate flag — Clerk
renders whichever providers the instance has enabled.

Routes:

| Route | Purpose |
| --- | --- |
| `/sign-in/*` | themed Clerk `<SignIn />` |
| `/sign-up/*` | themed Clerk `<SignUp />` |

The fixed corner chip on the game page shows **Sign in** for guests and the
Clerk user button for signed-in players. Account state currently only proves
identity; score sync and the leaderboard land with the Postgres work below.

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
- A light/dark toggle in the top-left overrides the system palette and
  remembers the choice in `localStorage['lo-theme']`. A tiny head script
  applies the saved theme before first paint, so there is no flash.

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
  routes/__root.tsx     document shell, metadata, conditional ClerkProvider
  routes/sign-in.$.tsx  themed Clerk sign-in (and its sub-steps)
  routes/sign-up.$.tsx  themed Clerk sign-up (and its sub-steps)
  components/           Board, Tile, SizePicker, StatBar, Controls, Message,
                        AccountChip, AuthShell, ThemeToggle
  game/                 engine, scramble, RNG, types (no DOM, no React)
  hooks/useGame.ts      game state, scoring, hint timer, localStorage bests
  lib/clerk.ts          key detection plus the shared Clerk appearance
  lib/theme.ts          theme resolution, storage key, pre-paint init script
  start.ts              CSRF middleware, plus Clerk middleware when configured
  styles.css            the original stylesheet, ported
tests/                  engine and parity suites
legacy/                 the original HTML and design notes, untouched
```

## Roadmap

The next stage adds a Postgres leaderboard behind Clerk sign-in, with
server-issued, signed puzzle tokens and server-verified scores. Until then the
game is fully playable offline, bests live in `localStorage` exactly like the
original, and signing in only establishes identity.
