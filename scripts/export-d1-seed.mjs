import { mkdir, readFile, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const DATABASE_DIR = new URL("../database/", import.meta.url);

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const quizzes = JSON.parse(await readFile(new URL("daily-quizzes.json", DATA_DIR), "utf8"));

const lines = [
  "BEGIN TRANSACTION;"
];

for (const skill of skills) {
  lines.push(`INSERT OR REPLACE INTO skills (id, ordinal, name, public_label, testable_task, description) VALUES (${sql(skill.id)}, ${skill.ordinal}, ${sql(skill.name)}, ${sql(skill.publicLabel)}, ${sql(skill.testableTask)}, ${sql(skill.description)});`);
}

for (const item of items) {
  lines.push(`INSERT OR REPLACE INTO items (id, skill_id, difficulty, prompt, explanation, status, tags) VALUES (${sql(item.id)}, ${sql(item.skill)}, ${item.difficulty}, ${sql(item.prompt)}, ${sql(item.explanation)}, 'active', ${sql(JSON.stringify(item.tags || []))});`);
  for (const choice of item.choices) {
    const choiceId = `${item.id}-${choice.id.toLowerCase()}`;
    lines.push(`INSERT OR REPLACE INTO choices (id, item_id, choice_key, choice_text, is_correct) VALUES (${sql(choiceId)}, ${sql(item.id)}, ${sql(choice.id)}, ${sql(choice.text)}, ${choice.id === item.answer ? 1 : 0});`);
  }
}

for (const quiz of quizzes) {
  lines.push(`INSERT OR REPLACE INTO daily_quizzes (id, quiz_date, status) VALUES (${sql(quiz.id)}, ${sql(quiz.date)}, 'published');`);
  for (const entry of quiz.items) {
    lines.push(`INSERT OR REPLACE INTO daily_quiz_items (quiz_id, item_id, position) VALUES (${sql(quiz.id)}, ${sql(entry.itemId)}, ${entry.position});`);
  }
}

lines.push("COMMIT;");

await mkdir(DATABASE_DIR, { recursive: true });
await writeFile(new URL("seed.sql", DATABASE_DIR), `${lines.join("\n")}\n`);
console.log(`Wrote database/seed.sql with ${items.length} items and ${quizzes.length} daily quizzes.`);

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
