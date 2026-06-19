import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const EXPECTED_SKILLS = 16;
const EXPECTED_PER_SKILL = 160;
const EXPECTED_PER_DIFFICULTY = 32;
const MIN_PROMPT_CHARS = 120;
const MAX_PROMPT_CHARS = 520;
const LABEL_LIST = ["A", "B", "C", "D"];
const LABELS = new Set(LABEL_LIST);
const EXPECTED_PER_LABEL_PER_SKILL_DIFFICULTY = EXPECTED_PER_DIFFICULTY / LABEL_LIST.length;
const EXPECTED_DAILY_PER_LABEL = EXPECTED_SKILLS / LABEL_LIST.length;
const CLUNKY_PROMPT_PATTERNS = [
  ["distracting quick-check frame", /^Quick check:/i],
  ["Scene label", /Scene:/],
  ["generic situation wrapper", /\bsituation\b/i],
  ["result-being-watched wrapper", /result being watched/i],
  ["supposed-to-help wrapper", /The change is supposed to help/i],
  ["outside-knowledge warning", /outside knowledge/i],
  ["use-only-facts warning", /Use only the facts/i],
  ["bureaucratic considering phrase", /is considering whether to/i]
];
const PERCENT_CHANGE_PATTERN = /\b(rose|fell|increased|decreased|dropped|reduced|improved|cut|lowered|raised)\s+by\s+\d+%/i;
const PERCENT_COMPARISON_CUE_PATTERN = /\b(compared with|compared to|before|after|starting number|percentage points|from\s+\d+%\s+to\s+\d+%|out of 100|chance)\b/i;

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const quizzes = JSON.parse(await readFile(new URL("daily-quizzes.json", DATA_DIR), "utf8"));

const errors = [];
const skillIds = new Set(skills.map((skill) => skill.id));
const skillCodes = new Set();
const itemIds = new Set();
const itemById = new Map();
const prompts = new Set();
const bySkill = new Map();
const bySkillDifficulty = new Map();
const bySkillDifficultyAnswer = new Map();

if (skills.length !== EXPECTED_SKILLS) {
  errors.push(`Expected ${EXPECTED_SKILLS} skills, found ${skills.length}.`);
}

for (const skill of skills) {
  const expectedCode = String(skill.ordinal).padStart(2, "0");
  if (skill.code !== expectedCode) {
    errors.push(`${skill.id} expected code ${expectedCode}, found ${skill.code}.`);
  }
  if (skillCodes.has(skill.code)) {
    errors.push(`Duplicate skill code: ${skill.code}`);
  }
  skillCodes.add(skill.code);
}

for (const item of items) {
  if (itemIds.has(item.id)) {
    errors.push(`Duplicate item id: ${item.id}`);
  }
  itemIds.add(item.id);
  itemById.set(item.id, item);

  if (prompts.has(item.prompt)) {
    errors.push(`Duplicate prompt: ${item.id}`);
  }
  prompts.add(item.prompt);

  if (!skillIds.has(item.skill)) {
    errors.push(`${item.id} references unknown skill ${item.skill}.`);
  }
  if (item.prompt.length < MIN_PROMPT_CHARS) {
    errors.push(`${item.id} prompt is too thin: ${item.prompt.length} chars, expected at least ${MIN_PROMPT_CHARS}.`);
  }
  if (item.prompt.length > MAX_PROMPT_CHARS) {
    errors.push(`${item.id} prompt is too long: ${item.prompt.length} chars, expected at most ${MAX_PROMPT_CHARS}.`);
  }
  if (!item.prompt.includes("?")) {
    errors.push(`${item.id} prompt must ask a direct question.`);
  }
  for (const [label, pattern] of CLUNKY_PROMPT_PATTERNS) {
    if (pattern.test(item.prompt)) {
      errors.push(`${item.id} still uses clunky prompt boilerplate: ${label}.`);
    }
  }
  if (hasBarePercentChange(item.prompt)) {
    errors.push(`${item.id} gives a percentage change without a clear comparison or reference point.`);
  }
  if (!Number.isInteger(item.difficulty) || item.difficulty < 1 || item.difficulty > 5) {
    errors.push(`${item.id} has invalid difficulty ${item.difficulty}.`);
  }
  if (!Array.isArray(item.choices) || item.choices.length !== 4) {
    errors.push(`${item.id} must have exactly 4 choices.`);
  } else {
    const choiceIds = new Set();
    const choiceTexts = new Set();
    for (const choice of item.choices) {
      if (!LABELS.has(choice.id)) {
        errors.push(`${item.id} has invalid choice id ${choice.id}.`);
      }
      choiceIds.add(choice.id);
      choiceTexts.add(choice.text);
    }
    if (choiceIds.size !== 4 || choiceTexts.size !== 4) {
      errors.push(`${item.id} has duplicate choice ids or text.`);
    }
    if (!choiceIds.has(item.answer)) {
      errors.push(`${item.id} answer ${item.answer} is not a valid choice.`);
    }
  }
  if (!item.explanation || item.explanation.length < 20) {
    errors.push(`${item.id} needs a fuller explanation.`);
  }

  bySkill.set(item.skill, (bySkill.get(item.skill) || 0) + 1);
  const skillDifficultyKey = `${item.skill}:${item.difficulty}`;
  bySkillDifficulty.set(skillDifficultyKey, (bySkillDifficulty.get(skillDifficultyKey) || 0) + 1);
  if (LABELS.has(item.answer)) {
    const skillDifficultyAnswerKey = `${item.skill}:${item.difficulty}:${item.answer}`;
    bySkillDifficultyAnswer.set(skillDifficultyAnswerKey, (bySkillDifficultyAnswer.get(skillDifficultyAnswerKey) || 0) + 1);
  }
}

for (const skill of skills) {
  const skillCount = bySkill.get(skill.id) || 0;
  if (skillCount !== EXPECTED_PER_SKILL) {
    errors.push(`${skill.id} expected ${EXPECTED_PER_SKILL} items, found ${skillCount}.`);
  }
  for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
    const count = bySkillDifficulty.get(`${skill.id}:${difficulty}`) || 0;
    if (count !== EXPECTED_PER_DIFFICULTY) {
      errors.push(`${skill.id} difficulty ${difficulty} expected ${EXPECTED_PER_DIFFICULTY}, found ${count}.`);
    }
    for (const label of LABEL_LIST) {
      const answerCount = bySkillDifficultyAnswer.get(`${skill.id}:${difficulty}:${label}`) || 0;
      if (answerCount !== EXPECTED_PER_LABEL_PER_SKILL_DIFFICULTY) {
        errors.push(`${skill.id} difficulty ${difficulty} expected ${EXPECTED_PER_LABEL_PER_SKILL_DIFFICULTY} ${label} answers, found ${answerCount}.`);
      }
    }
  }
}

for (const quiz of quizzes) {
  if (!quiz.id || !quiz.date) {
    errors.push("Daily quiz is missing id or date.");
  }
  if (!Array.isArray(quiz.items) || quiz.items.length !== EXPECTED_SKILLS) {
    errors.push(`${quiz.id} must contain ${EXPECTED_SKILLS} items.`);
    continue;
  }
  const quizSkills = new Set();
  const quizAnswerCounts = new Map(LABEL_LIST.map((label) => [label, 0]));
  for (const entry of quiz.items) {
    quizSkills.add(entry.skill);
    if (!itemIds.has(entry.itemId)) {
      errors.push(`${quiz.id} references unknown item ${entry.itemId}.`);
      continue;
    }
    const item = itemById.get(entry.itemId);
    if (item && LABELS.has(item.answer)) {
      quizAnswerCounts.set(item.answer, quizAnswerCounts.get(item.answer) + 1);
    }
  }
  if (quizSkills.size !== EXPECTED_SKILLS) {
    errors.push(`${quiz.id} does not have one item per skill.`);
  }
  for (const label of LABEL_LIST) {
    const answerCount = quizAnswerCounts.get(label);
    if (answerCount !== EXPECTED_DAILY_PER_LABEL) {
      errors.push(`${quiz.id} expected ${EXPECTED_DAILY_PER_LABEL} ${label} answers, found ${answerCount}.`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${skills.length} skills, ${items.length} items, and ${quizzes.length} daily quizzes.`);

function hasBarePercentChange(text) {
  return PERCENT_CHANGE_PATTERN.test(text) && !PERCENT_COMPARISON_CUE_PATTERN.test(text);
}
