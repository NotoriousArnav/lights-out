# AGENTS.md

## Project

- Single npm package: React 19 + TanStack Start/Router + Vite/Nitro. Production is one Vercel project; local DB is SQLite, production DB is Neon Postgres.
- `README.md` is the detailed source for product behavior, deployment, PWA, and SEO. Read it before changing those areas.

## Commands

- Node 24 + npm (`package-lock.json`). There is no lint or format script.
- `npm ci`
- `npm run dev` — port 3000.
- `npm run typecheck` — `tsc --noEmit`; strict, with `noUnused*` checks.
- `npm test` — all Vitest suites; parity boots jsdom and can take up to 120s.
- Focused test: `npx vitest run tests/engine.test.ts` (add `-t "name"` for one case).
- `npm run build` then `npm run start` — real Nitro output and service worker. `npm run preview` is not the production server.
- After adding or renaming `src/routes/*`, run `npm run generate-routes`; never hand-edit `src/routeTree.gen.ts`.

## Architecture

- `src/game/*` is DOM-free and mirrored press-for-press by `tests/parity.test.ts` against `legacy/Lights Out.html`. The README lists deliberately preserved quirks; do not “fix” them.
- Server authority lives in `src/server/game-fns.ts`, `game-token.ts`, `verify.ts`, and `score.ts`. Moves, hints, elapsed time, and score must be replayed/verified server-side; never trust client counters.
- `src/hooks/useGame.ts` owns game state, the first-move clock, hints, and submission. `src/hooks/useLeaderboard.ts` owns paging and refresh.
- `src/start.ts` adds CSRF for server functions and Clerk middleware only when `CLERK_SECRET_KEY` is set. Clerk is optional: without `VITE_CLERK_PUBLISHABLE_KEY` the app is guest-only.
- `src/routes/[__clerk].$.ts` is the Clerk Frontend API proxy for `*.vercel.app`; do not remove it when changing auth.
- No offline score sync: score submission is server-authoritative only. Native shells, if added, must not bypass server verification.

## Data

- SQLite and Postgres are parallel implementations: `schema.ts` + `sqlite-store.ts`/`scores.ts`, and `schema.pg.ts` + `postgres-store.ts`. Change both schemas/adapters and regenerate both migrations.
- Leaderboard SQL is duplicated in `scores.ts` and `postgres-store.ts`; keep the one-best-row-per-player query and tie-break order (`score DESC, moves ASC, hints ASC, elapsed_ms ASC, created_at_ms ASC`) in sync. Keep snake_case column names stable.
- Local SQLite lives at `.data/lights-out.db` and auto-migrates. Tests use in-memory SQLite; Postgres is not needed for `npm test`.
- Production requires a Postgres `DATABASE_URL`; `getStore()` throws if `NODE_ENV=production`/`VERCEL` and the URL is not Postgres.
- `npm run db:generate` (SQLite) / `npm run db:generate:pg` (Postgres). Apply production migrations with `DATABASE_URL="$DIRECT_DATABASE_URL" npm run db:migrate:pg`; never migrate from the Vercel build.
- `PUZZLE_SECRET` must be set and stable in production. Development falls back to a per-process random secret, so tokens do not survive restarts.

## PWA / SEO

- `npm run build` runs `scripts/build-sw.mjs` through Vite `closeBundle`; the SW is production-only. Edit `scripts/sw-template.js`/`build-sw.mjs`, not generated `sw.js` or `.output`.
- Keep SW generation in `closeBundle`; Nitro only serves files listed in its generated public-assets manifest.
- `scripts/build-sw.mjs` precaches every file under `public/`; exclude large or install-only assets when adding them.
- PWA manifest: `public/manifest.webmanifest`. Screenshots live in `public/screenshots/`; `sizes` must match the files exactly, and Chrome uses `wide` on desktop and `narrow` on Android.
- `src/lib/seo.ts` is the source of truth for origin/title/description/JSON-LD. `public/robots.txt`, `public/sitemap.xml`, and `public/og-image.png` are separate; update them if the origin changes.

## CI / releases

- `.github/workflows/ci.yml` runs typecheck, tests, build, and manifest validation on PRs, `main`, and `release/**`.
- `.github/workflows/release.yml` runs on `v*` tags and publishes every built artifact to a GitHub Release with `SHA256SUMS`. Manual dispatch from a branch uploads workflow artifacts only.
- Desktop/Android release jobs are gated on `native/desktop/package.json` and `native/android/gradlew` (or `native/android/android/gradlew`). Those native projects are not in the repo yet; do not assume `npm run build` produces Electron/APK artifacts.
- When adding native projects, use those paths so the existing matrix picks them up.

## Conventions

- Use `import type` where appropriate; `verbatimModuleSyntax` is enabled.
- Styling is hand-written CSS in `src/styles.css`; there is no Tailwind.
- Keep GPL-3.0, README credits, and the Twemoji/CC-BY attribution intact.
