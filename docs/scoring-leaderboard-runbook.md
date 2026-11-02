# XiXteen Scoring And Leaderboards

XiXteen can run as a static site, but public score recording needs a backend. The current backend target is Cloudflare Pages Functions plus D1.

## What Works Where

- GitHub Pages: quiz, practice, local skill map, local daily/weekly board.
- Cloudflare Pages + D1: everything above, plus public daily scores, weekly winners, and server-side skill stats.

The frontend automatically falls back to local-only mode when `/api/leaderboard` or `/api/score` is unavailable.

## Publishing the live site

The custom domains `xixteen.com` and `www.xixteen.com` are served by the Cloudflare Pages project `xixteen`. GitHub now runs verification only; it no longer reports a second, unrelated GitHub Pages publication.

1. Run `npm run site:build` after changing page/navigation templates and `npm run check` before committing.
2. Commit and push to `origin/main`.
3. With authenticated Wrangler available, run `npm run site:publish`.

The release command reruns checks, requires a clean checkout matching the pushed commit, compares the question bank and schedule with the live site, publishes the Functions and site, and compares the live domain's files with the checked source. If the question bank or schedule has changed, it first verifies database answer keys and existing daily placements, then appends missing boards. It refuses to overwrite existing boards. A failed step stops publication; if database dates were added but deployment failed, repeating the command is safe.

Wrangler needs the existing Pages permissions. Changes to the question bank or schedule also require D1 read/write permission (`d1:write`); a page-only release with byte-identical live data does not need database access. Use an authenticated `wrangler` on PATH, or set `XIXTEEN_WRANGLER_BIN` to the installed `wrangler.js` entry file. Do not put access tokens in source files. GitHub has no Cloudflare deployment credentials configured; publication uses the existing local sign-in.

### Extending the daily schedule

`data/daily-schedule.json` defines the start and end dates. Extend `endDate`, run `npm run generate`, and commit the updated configuration and generated schedule. The generator preserves all existing boards. Checks require at least 180 days of remaining coverage. `npm run site:publish` adds the same new dates to the scoring database before publishing the site.

The current schedule reaches June 18, 2027. The extension through December 31, 2028 is prepared but awaits database access; set `endDate` to `2028-12-31` when that access is available, regenerate, and publish with the checked command. No participant, attempt, score, or skill-stat tables are changed by schedule extension. Do not use the full corpus seed just to add dates: the targeted release path avoids replacing daily placements.

## API Endpoints

- `POST /api/score`
  - Receives participant ID, display name, quiz date, duration, and selected answers.
  - Scores answers against D1 item keys; client score is ignored.
  - Allows one public submission per participant, public name, and hashed device signal per daily quiz.
  - Stores attempts and updates `user_skill_stats`.
  - Flags unusually fast or incomplete runs so they are saved but excluded from public boards.

- `GET /api/leaderboard?date=YYYY-MM-DD&range=daily`
  - Returns accepted scores for one daily quiz.

- `GET /api/leaderboard?date=YYYY-MM-DD&range=weekly`
  - Returns summed accepted scores for the Monday-Sunday week containing `date`.

- `GET /api/profile?participantId=...`
  - Returns server-side daily scores and skill stats for that participant.

## First-Time Cloudflare Setup

```bash
npx wrangler login
npm run check
npm run db:seed
npx wrangler d1 create xixteen
```

Copy the generated `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "xixteen"
database_id = "..."
```

Create and seed the database:

```bash
npx wrangler d1 execute xixteen --file=database/schema.sql
npx wrangler d1 execute xixteen --file=database/seed.sql
```

Deploy the Pages project from the same repository root. The Functions API lives in `functions/api`.

## Local Smoke Test

```bash
npm run check
npm run db:seed
npm run dev:pages
```

Open the printed local URL. On the Wrangler dev server, the leaderboard controls should use `/api/leaderboard`. On a plain file server or GitHub Pages, they should fall back to local-only mode.

Local D1 commands and `npm run dev:pages` both read the `DB` binding from `wrangler.toml`, so seed the same configured database before starting the dev server.

## Re-Seeding After Corpus Changes

Run:

```bash
npm run check
npm run db:seed
npx wrangler d1 execute xixteen --file=database/seed.sql
```

`seed.sql` uses `INSERT OR REPLACE` for skills, items, choices, and daily quiz schedules. It does not delete participant scores.

## Existing Database Migration

If a D1 database was created before the public-score hardening fields were added, apply:

```bash
npx wrangler d1 execute xixteen --file=database/migrations/0001_scoreboard_hardening.sql
```

Fresh databases only need `database/schema.sql`.

## Anti-Cheat Limits

The MVP is intentionally light:

- answers are checked server-side;
- public names are limited to one score per quiz day;
- participant/device-ish submissions are limited to one score per quiz day;
- very fast or incomplete runs are saved but excluded from public leaderboards.

This is enough for friendly public competition, not high-stakes testing. Add Cloudflare Turnstile later if spam becomes a problem.
