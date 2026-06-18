# XiXteen Content Model

Every quiz item is built to have one clearly best answer:

- the prompt starts with a concrete scenario;
- the prompt gives all the information needed;
- the correct choice is unique;
- the explanation names the thinking move;
- each item belongs to exactly one numbered skill;
- every skill has 160 unique generated items across five difficulty levels.

The generator adds a short scene, the group affected, the result being watched, and a reminder that no outside knowledge is needed. `npm run audit` checks that every generated item keeps that context.

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
