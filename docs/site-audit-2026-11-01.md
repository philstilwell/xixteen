# XiXteen site audit — November 1, 2026

The site has a clear learner/instructor split, a complete set of teaching packs, and useful explanatory feedback. The most significant defects were in the learner interactions rather than the page layout.

## Corrective changes

- **Repeated practice questions:** a reproducible 24-question, single-level set contained only 16 distinct questions. Repeats inherited previous answers because answers are stored by question ID. Both focused and adaptive practice now exclude questions already selected for the current set.
- **Keyboard navigation:** replacing a question removed the focused button. Focus now moves to the answer explanation, the next question, and the results. Selected mode and leaderboard controls also expose their state to assistive technology.
- **Slow or failed public scores:** questions now appear before optional leaderboard/profile requests finish. Those requests have an eight-second timeout. A late weekly response cannot overwrite a newer daily selection, and a delayed score submission cannot replace a newly started practice session.
- **Unavailable browser storage:** saving progress no longer crashes quiz completion. A visible notice explains when results cannot be retained; messages no longer claim those results were saved.
- **Misleading controls:** a practice tile labelled “Return to practice” now returns to practice. The results' Daily Board button opens the daily board. Reset requires confirmation and explains that previously shared public scores remain.
- **Missing daily schedules:** the learner page no longer silently substitutes the first historical board for today. It explains the absence and keeps practice available.
- **Invalid requests:** empty/non-object score submissions, array-shaped answer lists, and impossible calendar dates receive controlled errors. A disconnected score database is reported as unavailable rather than as a working empty leaderboard.
- **Missing pages:** added a branded `404.html` with useful onward links. Previously, an unknown live address returned the homepage with a successful response.
- **Loading and motion:** added a question-loading message, a useful load-error retry, a JavaScript-disabled alternative, and reduced-motion support for learner scrolling and transitions.

## Validation

- Project checks pass: 41 HTML pages, 1,195 local references, 2,560 questions, 366 scheduled daily boards, article categories, and all generated instructor/student pages.
- Added `npm run runtime:check` to the normal check sequence. It covers 294 practice-set combinations, preference for unseen questions, blocked storage, missing daily schedules, and invalid server inputs.
- Tested eight representative page types at 1,440, 390, and 320 pixels wide: no horizontal page overflow or broken loaded images.
- Completed a 24-question practice session in the browser: 24 distinct prompts, correct progress, and continuous keyboard focus through answers and results.
- Simulated delayed/out-of-order leaderboard responses and delayed daily submissions on a local test server. The public production scoreboard was not populated with test scores.
- Checked instructor search, empty results, reset, skill-area filtering, phone-menu dismissal, separate student activities, and the print control.
- Tested both article quizzes, incomplete-answer prompts, full scores, retries, the forecast slider, and article-to-practice return links.
- Teaching-pack verification passed for 16 packs, 32 PDFs, 128 pages, 32 editable files, 16 individual ZIPs, and the collection ZIP. All fonts are embedded. Also checked the 50 PDFs under `output/pdf`: no unembedded font references found.
- Of 32 distinct external reference links, 28 responded successfully. Medium, SSRN, and Metaculus returned access restrictions (403); Reuters returned 401. These four were not classified as broken or replaced.

These are functional and structural checks, not a full accessibility certification, a security penetration test, or an expert review of every question. The question-bank audit uses automated rules; passing it does not establish classroom effectiveness or calibrated difficulty.

## Recommended next improvements

| Priority | Improvement | Why it matters |
| --- | --- | --- |
| High | Save and resume unfinished daily boards and practice sessions. | Refreshing, leaving the page, or switching modes currently discards the active attempt. Make resuming the default and restarting an explicit choice. |
| High | Offer a readable phone view of the skill grid. | The four-column grid reduces labels to 9 pixels on small phones and clips them. Keep the familiar overview, but offer larger cards or a labelled list. |
| High | Create one checked publishing workflow for the live site. | A push triggers GitHub Pages, while the live Cloudflare site needs a separate deployment. Run project checks before publishing and make the live result unambiguous. |
| High | Extend the daily schedule before June 19, 2027. | The current schedule ends June 18, 2027. Publish matching future schedules to the site and scoring database together. The new fallback prevents misleading old boards but does not create future ones. |
| Medium | Add an About page, contact route, clear classroom reuse terms, and plain-language data information. | Instructors need to know who made the materials and how they may adapt them. Learners need to understand device-only progress, optional public names/scores, and reset limits. |
| Medium | Pilot questions and teaching packs with learners/instructors. | Validate difficulty levels, time estimates, ambiguity, and whether feedback improves reasoning. Avoid strong skill judgments from a single answer; show the evidence behind progress labels. |
| Medium | Improve article image delivery; then consider splitting the question bank. | Article PNGs total about 7.2 MiB. Serve smaller modern-format copies while retaining originals. The question bank is about 5.2 MiB decoded but transferred at about 306 KB with compression in this audit, so image delivery is the clearer first target. |
| Lower | Unify article navigation and add search/share metadata. | Articles use a different header from learner/instructor pages. Shared navigation, a sitemap, and descriptive social previews would make discovery and sharing more consistent. |

Suggested order: preserve unfinished work, improve phone readability, then simplify publication and schedule maintenance. These changes improve everyday reliability before expanding the content library.
