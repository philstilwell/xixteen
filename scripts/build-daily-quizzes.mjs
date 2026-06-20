import { readFile, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const DEFAULT_START_DATE = "2026-06-18";
const DEFAULT_DAYS = 366;
const LABELS = ["A", "B", "C", "D"];
const MAX_SAME_ANSWER_RUN = 2;
const MIN_DISTINCT_ANSWERS_PER_ROW = 3;
const DAILY_ROW_SIZE = 4;
const MAX_SEQUENCE_ATTEMPTS = 2000;

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
const seenAnswerSequences = new Set();
const positionAnswerCounts = Array.from(
  { length: skills.length },
  () => new Map(LABELS.map((label) => [label, 0]))
);

for (let offset = 0; offset < days; offset += 1) {
  const date = addDays(startDate, offset);
  const difficulty = (Math.floor(offset / 7) % 5) + 1;
  const targetAnswers = balancedAnswerLabels(`${date}:answers`, skills.length, {
    dayIndex: offset,
    positionAnswerCounts,
    seenAnswerSequences
  });
  seenAnswerSequences.add(targetAnswers.join(""));
  targetAnswers.forEach((label, index) => {
    positionAnswerCounts[index].set(label, positionAnswerCounts[index].get(label) + 1);
  });
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

function balancedAnswerLabels(seed, total, context) {
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

  let bestLabels = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt += 1) {
    const labels = shuffled(entries, `${seed}:shuffle:${attempt}`).map((entry) => entry.label);

    if (!isAcceptableAnswerSequence(labels, context.seenAnswerSequences)) {
      continue;
    }

    const score = scoreAnswerSequence(labels, context) +
      hashString(`${seed}:tie:${attempt}`) / 0xffffffff / 1000;
    if (score < bestScore) {
      bestLabels = labels;
      bestScore = score;
    }
  }

  if (!bestLabels) {
    throw new Error(`Could not build a non-obvious balanced answer sequence for ${seed}.`);
  }

  return bestLabels;
}

function isAcceptableAnswerSequence(labels, seenAnswerSequences) {
  if (seenAnswerSequences.has(labels.join(""))) {
    return false;
  }
  if (longestSameAnswerRun(labels) > MAX_SAME_ANSWER_RUN) {
    return false;
  }

  for (let index = 0; index < labels.length; index += DAILY_ROW_SIZE) {
    const row = labels.slice(index, index + DAILY_ROW_SIZE);
    if (new Set(row).size < MIN_DISTINCT_ANSWERS_PER_ROW) {
      return false;
    }
  }

  return true;
}

function scoreAnswerSequence(labels, context) {
  const targetAfterToday = (context.dayIndex + 1) / LABELS.length;
  let score = 0;

  for (let index = 0; index < labels.length; index += 1) {
    const positionCounts = context.positionAnswerCounts[index];
    for (const label of LABELS) {
      const nextCount = positionCounts.get(label) + (labels[index] === label ? 1 : 0);
      score += (nextCount - targetAfterToday) ** 2;
    }
  }

  return score;
}

function longestSameAnswerRun(labels) {
  let longest = 0;
  let current = 0;
  let previous = null;

  for (const label of labels) {
    current = label === previous ? current + 1 : 1;
    previous = label;
    longest = Math.max(longest, current);
  }

  return longest;
}

function shuffled(entries, seed) {
  const result = [...entries];
  const random = seededRandom(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function seededRandom(seed) {
  let state = hashString(seed) || 1;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
