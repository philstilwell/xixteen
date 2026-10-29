# XiXteen ready-to-teach lesson template

Use `data/teaching-packs.json` as the shared source for the online lesson, student handout, instructor guide, and editable downloads. A complete pack lets an instructor teach without writing a missing scenario or guessing the intended answer.

## At a glance

- **Title:** a concrete teaching goal, understandable without the skill number.
- **Skill:** canonical ID, two-digit number, and exact public label from `data/skills.json`.
- **Audience and level:** name the intended learners; state prerequisites explicitly.
- **Teaching time and preparation time:** estimates labelled as suggested, not measured claims.
- **Format and materials:** individual/pair/group work, printing, and any device needs.
- **Learning outcomes:** two or three observable things learners should be able to do.

## Prepare

Supply all materials, definitions, and facts needed for the lesson. State whether scenarios are invented or source-backed. For empirical examples, verify and cite the source and preserve its limits. Keep student material and instructor answers separate.

## Teaching sequence

Give an ordered list of stages with minutes, a title, and concrete instructor actions. Stage times must add up to the advertised duration. Include an opener, the main activity, discussion, and an independent check for understanding.

## Each student activity

1. **Title:** name the task.
2. **Scenario:** include all required facts in this activity. Do not depend on an unexplained earlier example.
3. **Output:** specify what to produce, such as three labelled statements and one explanatory sentence.
4. **Numbered steps:** explain how to begin and any needed terms, units, formulas, or comparison periods.
5. **Success check:** a brief, visible test students can apply before seeing an answer.
6. **Response space:** enough room to complete the requested output, or a clear instruction to use paper.

An exit ticket must include a new, fully specified scenario that tests transfer of the same skill. Never ask the instructor to invent the case needed to finish the pack.

## Instructor guidance

- A model answer for every warm-up, activity, and exit ticket.
- An explanation of why each answer meets the stated task and what it does not establish.
- Discussion prompts with expected reasoning, rather than unsupported verdicts.
- Common misconceptions with a specific correction.
- More-support and more-challenge adaptations, including the answer or evaluation guidance for any additional task.
- Three observable assessment criteria; accept equivalent wording.
- A focused practice link and relevant optional reading, with no dependence on a login.

## Downloads

Each lesson supplies:

- Student PDF, with no model answers.
- Instructor PDF, with the teaching plan and all model answers.
- Editable Markdown versions of each.
- A ZIP containing the four files and a short reading-order note.

Every PDF font must be embedded, including fonts selected by fallback drawing code. Use `scripts/build-teaching-pack-pdfs.py` to rebuild the pack files after editing the shared data. The script checks the time totals and required activity fields.

## Before publication

- Read each activity without looking at its answer. Can a learner begin using only the supplied information?
- Check each model answer against the exact output and steps requested.
- Check that invented scenarios are labelled and claims preserve their evidential limits.
- Verify student files contain no instructor answers.
- Inspect rendered PDF pages for adequate writing space, readable text, intact headings, and no clipping.
- Verify font embedding and every download/practice link.
- Keep the online lesson and downloadable content generated from the same source.
