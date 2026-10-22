# Lights Out

The classic Lights Out puzzle, ported from a single HTML file to React 19 +
TanStack Start, with the original game's behavior preserved press for press.

Tap a tile to flip it and its neighbours. Turn every light off. Fewer moves,
fewer hints, and less time make a better score.

## Credits

- **Rahul Chakraborty** — developer of the original, single-file legacy game.
- **Arnav Ghosh** — ported the game to React + TanStack Start, added the
  server-verified leaderboard, and deployed it.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine, token, score, database and parity suites
npm run build    # production build
npm run typecheck
npm run db:generate  # regenerate SQLite migrations after a schema change
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
those work locally without setting anything up. A Clerk **production** instance
does not inherit those shared credentials: configure Google, GitHub, and Discord
with your own OAuth apps in the production instance. **Spotify requires your own
OAuth client** (Client ID and Secret from the Spotify developer dashboard),
added in Clerk under _SSO connections → Spotify_; it then appears on the sign-in
screen automatically. Enabling it in code is deliberately not a separate flag —
Clerk renders whichever providers the instance has enabled.

Routes:

| Route         | Purpose                                      |
| ------------- | -------------------------------------------- |
| `/sign-in/*`  | themed Clerk `<SignIn />`                    |
| `/sign-up/*`  | themed Clerk `<SignUp />`                    |
| `/__clerk/*`  | Clerk Frontend API proxy for `*.vercel.app`  |

The fixed corner chip on the game page shows **Sign in** for guests and the
Clerk user button for signed-in players. Signing in is required to post a score
to the global leaderboard; guests can still play and browse the rankings.

## High scores

The leaderboard is global and split by board size (3×3, 4×4 and 5×5). Every
verified run is stored, but the list shows each player's best run per size,
ranked by score, then moves, hints and time. The score is:

```text
max(0, 10_000 − 50 × moves − 200 × hints − 5 × seconds)
```

The clock starts on the first move, not when the puzzle is generated. Moves and
hints are verified server-side by replaying a signed game token from its seed;
the finish time is measured from the server's first-move timestamp. Hints mint a
new token with one more hint charged, and each token carries a unique id so the
same run cannot be submitted twice.

The sidebar shows the ranking beside the board on large landscape screens;
smaller screens get a **Scores** button and a modal. A Refresh button, window
focus, and a successful save all pull the latest rows.

## What is ported

The original was one 115-line file with all state in a closure. The port keeps
the same rules and splits them into a pure engine plus a React view:

| Original                             | Port                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `flip(i)`                            | `src/game/engine.ts` — immutable, returns new grid + solution set       |
| `newGame()` scramble                 | `src/game/scramble.ts` — same `n²×2` presses, same retry                |
| `sol` Set                            | `Puzzle.solution` — same insertion order, same `delete`/`add` semantics |
| Hint                                 | `hintTile()` — first element of the remaining solution, 1800 ms outline |
| `bests` in `localStorage['lo-best']` | `src/hooks/useGame.ts` — same key, same format                          |
| DOM built by hand                    | `src/components/*` — same markup, classes and CSS                       |

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
- A GitHub source link sits beside the theme toggle and stays available even
  when Clerk is not configured.

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
  routes/index.tsx      game page; the loader issues a signed puzzle token
  routes/__root.tsx     document shell, metadata, conditional ClerkProvider
  routes/sign-in.$.tsx  themed Clerk sign-in (and its sub-steps)
  routes/sign-up.$.tsx  themed Clerk sign-up (and its sub-steps)
  routes/[__clerk].$    Clerk Frontend API proxy for *.vercel.app
  components/           Board, Tile, SizePicker, StatBar, Controls, Message,
                        AccountChip, AuthShell, ThemeToggle, SourceLink,
                        HighScores, ScoresDialog, SaveStatus
  game/                 engine, scramble, RNG, types (no DOM, no React)
  hooks/useGame.ts      game state, first-move clock, hints, bests, submit
  hooks/useLeaderboard.ts  paged, refreshable leaderboard state
  server/game-fns.ts    issue/start/hint/submit/leaderboard server functions
  server/game-token.ts  HMAC-signed stateless game tokens
  server/verify.ts      replay and hint verification from the seed
  server/score.ts       the score formula
  server/db/            Drizzle schemas, SQLite and Neon stores, ranking queries
  lib/clerk.ts          key detection plus the shared Clerk appearance
  lib/theme.ts          theme resolution, storage key, pre-paint init script
  start.ts              CSRF middleware, plus Clerk middleware when configured
  styles.css            the original stylesheet plus the leaderboard layout
tests/                  engine, parity, token, verification, score, database
legacy/                 the original HTML and design notes, untouched
drizzle/                committed SQL migrations for the development database
drizzle-pg/             committed SQL migrations for Postgres
vercel.json             TanStack Start framework preset and build command
```

## Database and deployment

Development uses SQLite (`better-sqlite3` + Drizzle) at
`.data/lights-out.db`, which is gitignored. Migrations in `drizzle/` are
applied automatically the first time the server opens the database.

Production uses Postgres (`@neondatabase/serverless` +
`drizzle-orm/neon-http`). Generate and apply its migrations separately, using
the direct Neon connection string:

```bash
npm run db:generate:pg
DATABASE_URL="$DIRECT_DATABASE_URL" npm run db:migrate:pg
```

The app reads the pooled Neon URL from `DATABASE_URL` at runtime. Do not run
migrations from the Vercel build; apply them once, before the first production
request.

The app deploys as one Vercel project: Vite builds the client, and Nitro turns
the SSR entry and server functions into Vercel Functions. `vercel.json` selects
the TanStack Start preset; Vercel handles the rest. Add the variables from
`.env.example` in the Vercel project settings, using live Clerk keys and a
pooled Neon URL for Production. `.env.prod` and other local env files are
gitignored and are not read by Vercel.

### Clerk on `*.vercel.app`

The demo deployment is a Clerk production instance on
`lights-out-puzzle-game.vercel.app`. Clerk's SDKs automatically proxy Frontend
API requests through the app origin at `/__clerk`; the TanStack Start route
`src/routes/[__clerk].$.ts` forwards those requests to Clerk. Do not create DNS
records for `vercel.app`.

Use the live publishable and secret keys from the same production instance for
Vercel's Production environment, and development keys for Preview. A production
instance needs its own OAuth apps for Google, GitHub, and Discord; the shared
development credentials do not carry over. Because a `vercel.app` host cannot
own email DNS records, sign-in, sign-up, verification, and password-reset emails
use Clerk's shared `accounts.dev` infrastructure — test delivery with a real
mailbox before launch. `clerk deploy status` may still report `mail: pending`
because it expects DNS records; that check is not actionable for `vercel.app`.
Custom email templates, email links, invitations, organization invitations, and
fully branded auth require an owned custom domain.

Set `PUZZLE_SECRET` in the deployment environment (`openssl rand -hex 32`).
Tokens cannot be signed without it in production, and the value must stay
stable across deployments.

## License

Licensed under the [GNU General Public License v3.0](LICENSE).
