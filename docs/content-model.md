# XiXteen Content Model

Every quiz item is objective by construction:

- the prompt contains all necessary information;
- the correct choice is defensibly unique;
- the explanation names the reasoning move;
- each item belongs to exactly one of the 16 skills;
- every skill has 160 unique generated items, distributed across five difficulty levels.

Daily quizzes use the same 16 item IDs for every visitor on the same date. Practice sessions choose from the whole corpus and emphasize weaker skills based on recent local performance.

## The 16 Skills

1. What's the Claim?
2. What Do the Words Mean?
3. What's the Argument?
4. What's Assumed?
5. Does That Matter?
6. How Good Is the Evidence?
7. Can We Trust the Source?
8. Does the Logic Follow?
9. What's the Fallacy?
10. How Likely Is It?
11. What Do the Numbers Say?
12. Cause or Coincidence?
13. What Else Could Explain It?
14. What Bias Is Showing?
15. What Are the Tradeoffs?
16. How Should Belief Change?

## Fairness Rule

Public competition should use `daily_quizzes`. Randomized or adaptive pulls should be limited to practice and personal learning.
