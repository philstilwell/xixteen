# XiXteen

XiXteen supports learners and critical thinking instructors through 16 clear reasoning skills.

## Site sections

- `/` is the illustrated gateway with a choice between learners and instructors.
- `/learners/` contains the daily board, focused practice, skill map, and leaderboard.
- `/instructors/` contains three complete teaching packs, the 16 skill reference packets, and curriculum downloads.
- `/instructors/lessons/<slug>/` uses one shared lesson template; its `student/` page contains only student-facing activities, with no model answers.
- `/articles/` contains the longer lessons and case studies. Their focused-practice links preserve the return route to the article.
- Old root practice links and quiz anchors forward to `/learners/`; `/teachers/` forwards to `/instructors/`.

### Teaching pack authoring

`data/teaching-packs.json` is the shared source for lesson pages, student views, PDFs, and editable Markdown downloads. Follow `docs/lesson-template.md` for the required teaching structure.

After content changes, run `npm run instructors:build` and `npm run pdf:teaching-packs`. Review the generated pages and PDFs, then run `npm run check`. The PDF builder embeds its fonts. Complete ZIP packs contain the student handout, instructor guide, and editable text versions. Suggested lesson timings are planning estimates, not classroom-validated measurements.

Gateway illustrations and their exact ImageGen prompts are in `assets/gateway/`. Preserve the original PNGs; the site serves compressed WebP copies.

The current question bank contains **2,560 unique questions**:

```text
16 skills x 160 questions = 2,560 questions
```

Each skill has 32 questions at each of five difficulty levels. These counts come from `data/question-bank.json` and are checked by `npm run validate`.

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
- `data/classroom-exercises.json` contains one guided written activity per skill for the curriculum PDFs. After editing it, run `npm run pdf:curriculum` and review the rendered pages. The builder embeds its bundled TrueType fonts.
- `database/schema.sql` is designed for Cloudflare D1 or SQLite-compatible review.
- `npm run export:d1` writes `database/seed.sql` for D1 import.
- `npm run audit` reports clarity coverage and prompt-depth stats by skill.

## Leaderboards

The static app records local progress immediately. Public daily and weekly boards are supported by the Cloudflare Pages Functions in `functions/api` when a D1 database is bound as `DB`.

The public scoring path is intentionally no-paid-AI:

- `/api/score` checks daily answers on the server, records one public score per participant/name/device/day, and keeps unusually fast or incomplete runs out of public rankings.
- `/api/leaderboard` returns daily or weekly winners from accepted submissions.
- `/api/profile` returns server-side skill stats for a participant after public daily submissions.
- Practice and weak-skill recommendations still work locally when the API is unavailable.

To prepare D1 data:

```bash
npm run check
npm run db:seed
npx wrangler d1 create xixteen
npx wrangler d1 execute xixteen --file=database/schema.sql
npx wrangler d1 execute xixteen --file=database/seed.sql
```

Then paste the D1 database ID from `npx wrangler d1 create` into `wrangler.toml`. GitHub Pages cannot run the Functions API; public boards require hosting the same static files through Cloudflare Pages or another backend that exposes compatible `/api/*` routes.

## New articles

Follow [the article conventions](articles/AGENTS.md) for each new lesson:

1. Verify sources, identify the main reasoning lesson, and write clear teaching examples with appropriate evidence limits.
2. Add supportive **ImageGen illustrations** as part of authoring, usually two complementary visuals. Check their accuracy, add accessible descriptions and captions, and save their exact prompts with the image assets. This is a standard publication step unless the user requests otherwise.
3. Register the lesson's grid categories, generate their practice links, and include the shared section-highlighting menu. Practice links must preserve the return route to the article.
4. Include exercises, model answers, key insights, and a quiz with explanatory feedback where appropriate to the lesson. Every exercise needs its own scenario and facts, a defined student output, numbered steps, a visible success check, and a model answer that explains the assigned reasoning. Follow the exercise conventions in `articles/AGENTS.md`.
5. Check sources, images, links, interactions, and desktop/phone layouts, then run `npm run articles:check` before committing, pushing, and publishing.

## Operations

- [GitHub Pages DNS runbook](docs/github-pages-dns-runbook.md) covers the Namecheap/GitHub Pages custom-domain fix for `xixteen.com`.
- [Scoring and leaderboard runbook](docs/scoring-leaderboard-runbook.md) covers the public-score deployment path.
