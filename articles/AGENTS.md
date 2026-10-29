# Article conventions

Every article must identify the categories it actively teaches from XiXteen's 4×4 grid.

- Add its folder name as `slug` in `data/articles.json`. Choose one `primarySkill` and zero or more `relatedSkills` using IDs from `data/skills.json`.
- Assign categories for concepts taught or practised, not incidental mentions. Keep the primary category aligned with the main lesson.
- Use the grid's exact numbers and public labels. Do not replace them with informal tags.
- Put `<!-- article-categories:SLUG -->` and `<!-- /article-categories:SLUG -->` markers near the top of the article and inside its listing card in `articles/index.html`. Replace SLUG with the actual folder name.
- Run `npm run articles:build` to fill both displays from the shared metadata. Commit the resulting HTML; category labels must remain visible without JavaScript.
- Every category label links to `/?practice=SKILL_ID&article=SLUG#workbench`, which opens an eight-question practice set with a “Back to the article” link. Keep this behaviour in the shared category generator so new articles inherit it. The practice page accepts only article slugs registered in `data/articles.json`.
- Include `../../src/article-navigation.js` as a module on article pages. Use `.article-contents` links to the IDs of sections inside `.article-body`; the script keeps the left menu's active section current while scrolling.
- Keep article CSS version references current after styling changes. Preserve keyboard navigation, mobile layout, existing quizzes, and model answers.
- Run `npm run articles:check` before publication; it also runs within `npm run check`.

## Supportive ImageGen illustrations

Adding supportive ImageGen illustrations is a required step for every new article, unless the user explicitly asks to omit them.

1. During the outline, identify the concepts, comparisons, or reasoning steps that a picture will clarify. Usually plan two complementary illustrations; choose the number for teaching value, not decoration.
2. Use the built-in ImageGen tool, which the user has selected as the default for article illustrations. Read the ImageGen skill. State the expected cost before any generation that incurs a charge; do not silently switch to a paid API or another generator.
3. Generate original educational images with clear labels, generous spacing, and the established ivory, ink, and teal article style. Use a shared example when comparing concepts. Label invented scenarios as illustrative and never invent research results, rankings, or numerical evidence.
4. Inspect every image before publication. Check spelling, arrows, labels, arithmetic, chart proportions, conceptual accuracy, and readability at article width. Correct errors with ImageGen before embedding. Keep exact numerical tables or charts in the article where readers need to inspect the values.
5. Copy final images into a dedicated `assets/articles/` folder. Save the exact prompts, generation method, date, relevant sources, and whether figures are invented in that folder's `image-prompts.md`. Keep the generated originals intact.
6. Embed each image next to the explanation it supports, using `.lesson-figure`. Supply descriptive alt text, a teaching caption, explicit width and height, and a link to the full-size image. Credit ImageGen and distinguish illustrative scenarios from empirical results. The essential lesson must also remain available in text.
7. Before publishing, inspect the figures on desktop and phone widths, check image loading and enlargement links, and ensure the added height does not break the active-section menu. Include the images and prompts in the normal commit, push, and publication.
