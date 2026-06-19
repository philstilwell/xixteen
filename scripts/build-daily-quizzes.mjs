import { readFile, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const DEFAULT_START_DATE = "2026-06-18";
const DEFAULT_DAYS = 366;
const LABELS = ["A", "B", "C", "D"];

const startDate = process.argv[2] || DEFAULT_START_DATE;
const days = Number.parseInt(process.argv[3] || `${DEFAULT_DAYS}`, 10);

if (!Number.isInteger(days) || days < 1) {
  throw new Error("Days must be a positive integer.");
}

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));

const bySkillDifficulty = new Map();
for (const item of items) {
  const key = `${item.skill}:${item.difficulty}`;
  const list = bySkillDifficulty.get(key) || [];
  list.push(item);
  bySkillDifficulty.set(key, list);
}

for (const list of bySkillDifficulty.values()) {
  list.sort((a, b) => a.id.localeCompare(b.id));
}

const quizzes = [];
for (let offset = 0; offset < days; offset += 1) {
  const date = addDays(startDate, offset);
  const difficulty = (Math.floor(offset / 7) % 5) + 1;
  const targetAnswers = balancedAnswerLabels(`${date}:answers`, skills.length);
  const quizItems = skills.map((skill, skillIndex) => {
    const pool = bySkillDifficulty.get(`${skill.id}:${difficulty}`);
    if (!pool || pool.length === 0) {
      throw new Error(`No items for ${skill.id} difficulty ${difficulty}`);
    }
    const targetAnswer = targetAnswers[skillIndex];
    const answerPool = pool.filter((item) => item.answer === targetAnswer);
    if (answerPool.length === 0) {
      throw new Error(`No ${targetAnswer} answer items for ${skill.id} difficulty ${difficulty}`);
    }
    const picked = answerPool[hashString(`${date}:${skill.id}:${targetAnswer}`) % answerPool.length];
    return {
      position: skillIndex + 1,
      skill: skill.id,
      itemId: picked.id
    };
  });
  quizzes.push({
    id: `daily-${date}`,
    date,
    difficulty,
    items: quizItems
  });
}

await writeFile(new URL("daily-quizzes.json", DATA_DIR), `${JSON.stringify(quizzes, null, 2)}\n`);
console.log(`Generated ${quizzes.length} daily quizzes starting ${startDate}.`);

function addDays(isoDate, offset) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function balancedAnswerLabels(seed, total) {
  if (total % LABELS.length !== 0) {
    throw new Error(`Cannot balance ${total} quiz items across ${LABELS.length} answer labels.`);
  }
  const copiesPerLabel = total / LABELS.length;
  const entries = [];
  for (const label of LABELS) {
    for (let copy = 0; copy < copiesPerLabel; copy += 1) {
      entries.push({ label, copy });
    }
  }
  return entries
    .sort((a, b) =>
      hashString(`${seed}:${a.label}:${a.copy}`) - hashString(`${seed}:${b.label}:${b.copy}`) ||
      a.label.localeCompare(b.label) ||
      a.copy - b.copy
    )
    .map((entry) => entry.label);
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
