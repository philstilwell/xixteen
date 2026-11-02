# XiXteen improvements — November 2, 2026

## Implemented improvements

- Daily boards and practice sets save separately in this browser. Returning restores the same questions, answers, feedback, and position. Time away is paused. Completed results can be reviewed without recording or submitting another score.
- Restart is explicit and confirmed. Replacing unfinished practice also asks first. Reset clears local sessions as well as the profile. Invalid or obsolete saved data is rejected, and a stale tab stops saving instead of overwriting a newer tab's progress.
- Phones show two columns of skill cards with full 16-pixel labels and visible progress. The desktop overview remains four columns.
- Progress labels show the number of answers and identify small samples as early evidence. Results no longer infer a strong skill from one correct answer.
- About/contact, classroom-use, privacy/saved-progress, and classroom-pilot pages share navigation and footer links. Classroom materials may be used and adapted free with credit; commercial resale is prohibited, as selected by the owner.
- Articles share the site's navigation. Five illustrated article images now use WebP copies: 619,578 bytes combined instead of 7,500,076 bytes, a 91.7% reduction. Full-size original PNGs remain available.
- Added descriptive social previews, a 42-address sitemap, and a public feedback form that asks users to omit private student information.
- A single checked Cloudflare publishing command verifies the pushed source, protects existing daily boards, deploys, and checks live files. GitHub verifies changes instead of publishing a separate GitHub Pages site.

## Verification

- All project checks pass: 45 HTML pages, 1,425 local references, 2,560 questions, generated teaching pages, and 294 practice combinations.
- Saved-session checks cover reload, separate modes, paused time, completed results without double counting, date changes, invalid data, restart, and conflicting tabs.
- Browser checks passed on 11 representative page types at 1,440, 390, and 320 pixels wide: no horizontal overflow, broken loaded images, or JavaScript errors.
- Browser checks also covered daily/practice switching, exact answer retention, results after reload, cancel/confirm restart and reset, article quiz completion/retry, the forecast slider, and phone-menu dismissal.
- No test scores were sent to the public scoreboard.

## Work requiring access or classroom participation

The current daily schedule still ends June 18, 2027. An extension through December 31, 2028 was generated and validated (928 daily boards), preserving all 366 existing boards. Publishing that extension to both the site and scoring service awaits approval to add D1 database access to the existing Cloudflare sign-in. The checked release command appends missing dates and refuses to replace published boards or scores.

The pilot guide and observation sheet are ready. Actual classroom validation requires learners and instructors; it has not been performed. Splitting the question bank is deferred because the audit found its compressed transfer modest compared with the original article images.
