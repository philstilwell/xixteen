import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const MIN_PROMPT_CHARS = 120;
const MAX_PROMPT_CHARS = 520;
const CLUNKY_PROMPT_PATTERNS = [
  ["Scene label", /Scene:/],
  ["generic situation wrapper", /\bsituation\b/i],
  ["result-being-watched wrapper", /result being watched/i],
  ["supposed-to-help wrapper", /The change is supposed to help/i],
  ["outside-knowledge warning", /outside knowledge/i],
  ["use-only-facts warning", /Use only the facts/i],
  ["bureaucratic considering phrase", /is considering whether to/i]
];

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const skillById = new Map(skills.map((skill) => [skill.id, skill]));
const bySkill = new Map();
const issues = [];

for (const item of items) {
  const list = bySkill.get(item.skill) || [];
  list.push(item);
  bySkill.set(item.skill, list);

  if (item.prompt.length < MIN_PROMPT_CHARS) {
    issues.push(`${item.id} prompt below ${MIN_PROMPT_CHARS} chars`);
  }
  if (item.prompt.length > MAX_PROMPT_CHARS) {
    issues.push(`${item.id} prompt above ${MAX_PROMPT_CHARS} chars`);
  }
  if (!item.prompt.includes("?")) {
    issues.push(`${item.id} prompt does not ask a direct question`);
  }
  if ((item.prompt.match(/[.!?]/g) || []).length < 2) {
    issues.push(`${item.id} has too few sentence breaks`);
  }
  for (const [label, pattern] of CLUNKY_PROMPT_PATTERNS) {
    if (pattern.test(item.prompt)) {
      issues.push(`${item.id} still uses clunky prompt boilerplate: ${label}`);
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("Question bank clarity audit:");
for (const skill of skills) {
  const skillItems = bySkill.get(skill.id) || [];
  const lengths = skillItems.map((item) => item.prompt.length).sort((a, b) => a - b);
  const summary = {
    min: lengths[0],
    p25: percentile(lengths, 0.25),
    median: percentile(lengths, 0.5),
    p75: percentile(lengths, 0.75),
    max: lengths.at(-1)
  };
  console.log(`${skill.code} ${skill.publicLabel}: ${skillItems.length} items, prompt chars min/p25/median/p75/max = ${summary.min}/${summary.p25}/${summary.median}/${summary.p75}/${summary.max}`);
}

console.log(`Audited ${items.length} items across ${skills.length} skills.`);

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  return sorted[Math.floor((sorted.length - 1) * p)];
}
