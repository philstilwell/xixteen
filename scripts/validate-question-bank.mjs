import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const EXPECTED_SKILLS = 16;
const EXPECTED_PER_SKILL = 160;
const EXPECTED_PER_DIFFICULTY = 32;
const LABELS = new Set(["A", "B", "C", "D"]);

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const quizzes = JSON.parse(await readFile(new URL("daily-quizzes.json", DATA_DIR), "utf8"));

const errors = [];
const skillIds = new Set(skills.map((skill) => skill.id));
const itemIds = new Set();
const prompts = new Set();
const bySkill = new Map();
const bySkillDifficulty = new Map();

if (skills.length !== EXPECTED_SKILLS) {
  errors.push(`Expected ${EXPECTED_SKILLS} skills, found ${skills.length}.`);
}

for (const item of items) {
  if (itemIds.has(item.id)) {
    errors.push(`Duplicate item id: ${item.id}`);
  }
  itemIds.add(item.id);

  if (prompts.has(item.prompt)) {
    errors.push(`Duplicate prompt: ${item.id}`);
  }
  prompts.add(item.prompt);

  if (!skillIds.has(item.skill)) {
    errors.push(`${item.id} references unknown skill ${item.skill}.`);
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
  for (const entry of quiz.items) {
    quizSkills.add(entry.skill);
    if (!itemIds.has(entry.itemId)) {
      errors.push(`${quiz.id} references unknown item ${entry.itemId}.`);
    }
  }
  if (quizSkills.size !== EXPECTED_SKILLS) {
    errors.push(`${quiz.id} does not have one item per skill.`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${skills.length} skills, ${items.length} items, and ${quizzes.length} daily quizzes.`);
