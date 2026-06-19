# XiXteen

XiXteen is a daily thinking quiz built around 16 clear reasoning skills.

The first corpus target is intentionally large:

```text
16 skills x 160 unique items = 2,560 items
```

Daily competition uses one fixed item from each skill for a given date. Practice mode can use the wider bank without affecting the public leaderboard.

## Local Checks

```bash
npm run check
```

This regenerates the skill file, the question bank, and daily quiz schedule, then validates and audits the corpus. The audit checks every item for clarity, coherence, and pedagogical value, including enough detail, a direct question, readable length, skill-specific feedback, and no clunky boilerplate.

## Data Model

- `data/skills.json` is the canonical numbered skill list.
- `data/question-bank.json` contains objective multiple-choice items.
- `data/daily-quizzes.json` contains the shared daily quiz schedule.
- `database/schema.sql` is designed for Cloudflare D1 or SQLite-compatible review.
- `npm run export:d1` writes `database/seed.sql` for D1 import.
- `npm run audit` reports clarity coverage and prompt-depth stats by skill.

## Leaderboards

The static app records local progress immediately. Public daily and weekly boards are supported by the Cloudflare Pages Functions in `functions/api` when a D1 database is bound as `DB`.
