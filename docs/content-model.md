# XiXteen Content Model

The current bank contains **2,560 unique questions across 16 categories**: 160 per skill, with 32 at each of five difficulty levels. The daily board draws one question per category; practice uses the same bank.

Every quiz item is built to have one clearly best answer:

- the prompt starts with a concrete scenario;
- the prompt gives all the information needed;
- the correct choice is unique;
- the explanation names the thinking move;
- each item belongs to exactly one numbered skill;
- each item carries its target skill ID in `tags`;
- every skill has 160 unique generated items across five difficulty levels.

The generator now puts the context inside the question itself instead of adding a generic setup paragraph. `npm run audit` checks each item for clarity, coherence, and pedagogical value: direct questions, enough detail, reasonable prompt length, valid answer choices, skill-specific explanation cues, target-skill tags, and old boilerplate such as `Scene:` or `result being watched`.

Daily quizzes use the same 16 item IDs for every visitor on the same date. Practice sessions choose from the whole bank and lean toward weaker skills based on recent local performance.

## The 16 Skills

01. What's the Claim?
02. What Do the Words Mean?
03. What's the Argument?
04. What's Assumed?
05. Does That Matter?
06. How Good Is the Evidence?
07. Can We Trust the Source?
08. Does the Logic Follow?
09. What's the Fallacy?
10. How Likely Is It?
11. What Do the Numbers Say?
12. Cause or Coincidence?
13. What Else Could Explain It?
14. What Bias Is Showing?
15. What Are the Tradeoffs?
16. How Should Belief Change?

## Fairness Rule

Public competition should use `daily_quizzes`. Random or adaptive pulls should be limited to practice and personal learning.

## Written exercises and classroom activities

Article exercises and the 16 printable activities use the same teaching standard: a self-contained scenario, all required facts, a clearly stated student output, numbered steps, any needed formula or term explanation, and a visible check before the model answer. The answer must follow those steps and explain its adequacy without adding requirements the student was never given.

Printable activities are stored in `data/classroom-exercises.json`, keyed by the canonical skill IDs. `scripts/build-curriculum-pdf.py` includes each activity in its skill packet and the complete curriculum. The existing multiple-choice bank remains the source for daily and focused practice.
