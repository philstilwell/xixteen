# Article conventions

Every article must identify the categories it actively teaches from XiXteen's 4×4 grid.

- Add its folder name as `slug` in `data/articles.json`. Choose one `primarySkill` and zero or more `relatedSkills` using IDs from `data/skills.json`.
- Assign categories for concepts taught or practised, not incidental mentions. Keep the primary category aligned with the main lesson.
- Use the grid's exact numbers and public labels. Do not replace them with informal tags.
- Put `<!-- article-categories:SLUG -->` and `<!-- /article-categories:SLUG -->` markers near the top of the article and inside its listing card in `articles/index.html`. Replace SLUG with the actual folder name.
- Run `npm run articles:build` to fill both displays from the shared metadata. Commit the resulting HTML; category labels must remain visible without JavaScript.
- Include `../../src/article-navigation.js` as a module on article pages. Use `.article-contents` links to the IDs of sections inside `.article-body`; the script keeps the left menu's active section current while scrolling.
- Keep article CSS version references current after styling changes. Preserve keyboard navigation, mobile layout, existing quizzes, and model answers.
- Run `npm run articles:check` before publication; it also runs within `npm run check`.
