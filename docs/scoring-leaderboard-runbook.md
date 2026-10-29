# XiXteen Scoring And Leaderboards

XiXteen can run as a static site, but public score recording needs a backend. The current backend target is Cloudflare Pages Functions plus D1.

## What Works Where

- GitHub Pages: quiz, practice, local skill map, local daily/weekly board.
- Cloudflare Pages + D1: everything above, plus public daily scores, weekly winners, and server-side skill stats.

The frontend automatically falls back to local-only mode when `/api/leaderboard` or `/api/score` is unavailable.

## Publishing the live site

As verified on October 29, 2026, `xixteen.com` and `www.xixteen.com` are attached to the Cloudflare Pages project `xixteen` (`xixteen.pages.dev`). That project has no Git integration. The GitHub Pages workflow still runs on a push to `main`, but it does not update the live Cloudflare site.

After committing, pushing, and completing the checks, deploy the same checkout from the repository root:

```bash
npx wrangler pages deploy . --project-name xixteen --branch main
```

This includes the existing Functions API and the `DB` binding in `wrangler.toml`. Page-layout or teaching-pack changes do not require database creation, migration, or re-seeding. Verify the deployment's success and the live domain before reporting publication complete.

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
