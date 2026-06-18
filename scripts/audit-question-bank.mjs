import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const MIN_PROMPT_CHARS = 250;

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const skillById = new Map(skills.map((skill) => [skill.id, skill]));
const bySkill = new Map();
const issues = [];

for (const item of items) {
  const list = bySkill.get(item.skill) || [];
  list.push(item);
  bySkill.set(item.skill, list);

  if (!item.prompt.includes("Scene:")) {
    issues.push(`${item.id} missing Scene context`);
  }
  if (item.prompt.length < MIN_PROMPT_CHARS) {
    issues.push(`${item.id} prompt below ${MIN_PROMPT_CHARS} chars`);
  }
  if (!item.prompt.includes("The change is supposed to help")) {
    issues.push(`${item.id} missing purpose/result context`);
  }
  if ((item.prompt.match(/[.!?]/g) || []).length < 4) {
    issues.push(`${item.id} has too few sentence breaks`);
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
